/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import { mapValues, pick } from 'lodash';
import { firstValueFrom, lastValueFrom, filter } from 'rxjs';
import { naturalLanguageToEsql } from '../../../../server/tasks/nl_to_esql';
import { chatClient, evaluationClient, logger } from '../../services';
import { loadDocuments } from '../../../../server/tasks/nl_to_esql/load_documents';
import { isOutputCompleteEvent } from '../../../../common';

interface TestCase {
  title: string;
  question: string;
  expected?: string;
  criteria?: string[];
  only?: boolean;
}

interface Section {
  title: string;
  tests: TestCase[];
}

const callNaturalLanguageToEsql = async (question: string) => {
  return await lastValueFrom(
    naturalLanguageToEsql({
      client: {
        output: chatClient.output,
        chatComplete: chatClient.chatComplete,
      },
      connectorId: chatClient.getConnectorId(),
      input: question,
      logger: {
        debug: (source) => {
          logger.debug(typeof source === 'function' ? source() : source);
        },
      },
    })
  );
};

const expectedQueryCriteria = (expected: string) => {
  return `The answer provides a ES|QL query that is functionally equivalent to:

          \`\`\`esql
          ${expected}
          \`\`\`

          It's OK if column names are slightly different, or if the used functions or operators are different,
          as long as the expected end result is the same.`;
};

const retrieveUsedCommands = async ({
  question,
  answer,
  esqlDescription,
}: {
  question: string;
  answer: string;
  esqlDescription: string;
}) => {
  const commandsListOutput = await firstValueFrom(
    evaluationClient
      .output('retrieve_commands', {
        connectorId: evaluationClient.getEvaluationConnectorId(),
        system: `
      You are a helpful, respected Elastic ES|QL assistant.

      Your role is to enumerate the list of ES|QL commands and functions that were used
      on a question and its answer.

      Only return each command or function once, even if they were used multiple times.

      The following extract of the ES|QL documentation lists all the commands and functions available:

      ${esqlDescription}
    `,
        input: `
      # Question
      ${question}

      # Answer
      ${answer}
      `,
        schema: {
          type: 'object',
          properties: {
            commands: {
              description:
                'The list of commands that were used in the provided ES|QL question and answer',
              type: 'array',
              items: { type: 'string' },
            },
            functions: {
              description:
                'The list of functions that were used in the provided ES|QL question and answer',
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['commands', 'functions'],
        } as const,
      })
      .pipe(filter(isOutputCompleteEvent))
  );

  const output = commandsListOutput.output;

  const keywords = [
    ...(output.commands ?? []),
    ...(output.functions ?? []),
    'SYNTAX',
    'OVERVIEW',
    'OPERATORS',
  ].map((keyword) => keyword.toUpperCase());

  return keywords;
};

async function evaluateEsqlQuery({
  question,
  expected,
  criteria = [],
}: {
  question: string;
  expected?: string;
  criteria?: string[];
}): Promise<void> {
  logger.debug(`Evaluation: ${question}`);

  const generateEvent = await callNaturalLanguageToEsql(question);
  const answer = generateEvent.content!;

  logger.debug(`Received response: ${answer}`);

  const [systemMessage, esqlDocs] = await loadDocuments();

  const usedCommands = await retrieveUsedCommands({
    question,
    answer,
    esqlDescription: systemMessage,
  });

  const requestedDocumentation = mapValues(pick(esqlDocs, usedCommands), ({ data }) => data);

  const evaluation = await evaluationClient.evaluate({
    input: `
    # Question

    ${question}

    # Answer

    ${generateEvent.content}

    `,
    criteria: [...(expected ? [expectedQueryCriteria(expected)] : []), ...criteria],
    system: `
    The assistant was asked to generate an ES|QL query based on the question from the user.

    Here is the documentation about the commands and function that are being used
    in the ES|QL queries present in the question and the answer.

    ${Object.values(requestedDocumentation).join('\n\n')}
    `,
  });

  expect(evaluation.passed).to.be(true);
}

const buildTestDefinitions = (): Section[] => {
  const testDefinitions: Section[] = [
    {
      title: 'ES|QL query generation',
      tests: [
        {
          title: 'Generates a query to show the volume of logs over time',
          question: `From the "kibana_sample_data_logs" index, show me the volume of logs per day over the last 10 days
      Assume the following fields:
      - @timestamp`,
          expected: `FROM kibana_sample_data_logs
          | WHERE @timestamp > NOW() - 10 days
          | STATS volume = COUNT(*) BY BUCKET(@timestamp, 1 day)`,
        },
        {
          title: 'Generates a query to show employees filtered by name and grouped by hire_date',
          question: `From the employees index, I want to see how many employees with a "B" in their first name
      where hired each month over the past 2 years.
      Assume the following fields:
      - hire_date
      - first_name
      - last_name`,
          expected: `FROM employees
      | WHERE first_name LIKE "*B*" AND hire_date >= NOW() - 2 years
      | STATS COUNT(*) BY BUCKET(hire_date, 1 month)
      | SORT hire_date`,
        },
        {
          title: 'Generates a query to show employees which have a palindrome as last name',
          question: `From the employees index, I want to find all employees with a palindrome as last name
         (which can be read the same backward and forward), and then return their last name and first name
      - last_name
      - first_name`,
          expected: `FROM employees
      | EVAL reversed_last_name = REVERSE(last_name)
      | WHERE TO_LOWER(last_name) == TO_LOWER(reversed_last_name)
      | KEEP last_name, first_name`,
        },
        {
          title: 'Generates a query to show the top 10 domains by doc count',
          question: `For standard Elastic ECS compliant packetbeat data view (\`packetbeat-*\`),
      show me the top 10 unique destination.domain with the most docs.
      Assume the following fields:
      - destination.domain`,
          expected: `FROM packetbeat-*
      | STATS doc_count = COUNT(*) BY destination.domain
      | SORT doc_count DESC
      | LIMIT 10`,
        },
        {
          title: 'Generates a query to show the top 5 employees sorted ascending by hire date',
          question: `From employees, I want to see the 5 earliest employees (hire_date), I want to display
      only the month and the year that they were hired in and their employee number (emp_no).
      Format the date as e.g. "September 2019".`,
          expected: `FROM employees
      | EVAL hire_date_formatted = DATE_FORMAT("MMMM YYYY", hire_date)
      | SORT hire_date
      | KEEP emp_no, hire_date_formatted
      | LIMIT 5`,
        },
        {
          title: 'Explains that pagination is not supported when requested',
          question: `From employees, I want to sort the documents by \`salary\`,
      and then return 10 results per page, and then see the second page`,
          criteria: [
            `The assistant should clearly mention that pagination is currently not supported in ES|QL.
            It might provide a workaround, even if this should not be considered mandatory for this criteria.`,
          ],
        },
        {
          title:
            'Generates a query to extract the year and shows 10 employees that were hired in 2024',
          question: `From employees, extract the year from hire_date and show 10 employees hired in 2024`,
          expected: `FROM employees
      | WHERE DATE_EXTRACT("year", hire_date) == 2024
      | LIMIT 10`,
        },
        {
          title: 'Generates a query to calculate the avg cpu usage over the last 15m per service',
          question: `Assume my metrics data is in \`metrics-*\`. I want to see what
      a query would look like that gets the average CPU per service,
      limit it to the top 10 results, in 1m buckets, and only the last 15m.
      Assume the following fields:
      - @timestamp
      - system.cpu.total.norm.pct
      - service.name`,
          expected: `FROM metrics-*
      | WHERE @timestamp >= NOW() - 15 minutes
      | STATS avg_cpu = AVG(system.cpu.total.norm.pct) BY BUCKET(@timestamp, 1m), service.name
      | SORT avg_cpu DESC
      | LIMIT 10`,
        },
        {
          title: 'Generates a query to show logs volume with some complex multi-field filter',
          question: `From the "sample_logs" index, show me the volume of daily logs
          from source "foo" or "bar", with message longer than 62 chars and not containing "dolly", and with INFO level.
      Assume the following fields:
      - source
      - message
      - level
      - @timestamp`,
          expected: `│ FROM sample_logs
      | WHERE source IN ("foo", "bar") AND LENGTH(message) > 62 AND message NOT LIKE "*dolly*" AND level == "INFO"
      | STATS COUNT(*) BY day = BUCKET(@timestamp, 1d)
      | SORT day ASC`,
        },
        {
          title: 'Generates a query to show normalized CPU per host',
          question: `My data is in \`metricbeat*\`. Show me a query to see the percentage
      of CPU time (system.cpu.system.pct) normalized by the number of CPU cores
      (system.cpu.cores), broken down by host name.
      Assume the following fields:
      - system.cpu.system.pct
      - system.cpu.cores
      - host.name`,
          expected: `FROM metricbeat*
      | EVAL system_pct_normalized = TO_DOUBLE(system.cpu.system.pct) / system.cpu.cores
      | STATS avg_system_pct_normalized = AVG(system_pct_normalized) BY host.name
      | SORT host.name ASC`,
        },
        {
          title: 'Generates a query to show normalized CPU per host',
          question: `From the access_logs index, I want to see the 50, 95 and 99 percentile
          of response_time, break down by month over the past year.
      Assume the following fields:
      - @timestamp
      - response_time
      - status_code`,
          expected: ` FROM access_logs
      | WHERE @timestamp > NOW() - 1 year
      | STATS p50 = PERCENTILE(response_time, 50), p95 = PERCENTILE(response_time, 95), p99 = PERCENTILE(response_time, 99)
      BY month = BUCKET(@timestamp, 1 month)
      | SORT month`,
        },
        {
          title: 'Generates a query using DISSECT to parse a postgres log message',
          question: `Show me an example ESQL query to extract the query duration
      from postgres log messages in postgres-logs*, with this format:
      \`2021-01-01 00:00:00 UTC [12345]: [1-1] user=postgres,db=mydb,app=[unknown],client=127.0.0.1 LOG:  duration: 123.456 ms  statement: SELECT * FROM my_table\`.
      Calculate the average.
      Assume the following fields:
      - message`,
          expected: `FROM postgres-logs*
      | DISSECT message "%{}:  duration: %{query_duration} ms  %{}"
      | EVAL duration_double = TO_DOUBLE(duration)
      | STATS AVG(duration_double)`,
        },
        {
          title: 'Generates a query using GROK to parse a postgres log message',
          question: `Consider the postgres-logs index, with the message field having the following format:
      \`2023-01-23T12:15:00.000Z ip=127.0.0.1 email=some.email@foo.com userid=42 [some message]\`.
      Using GROK, please count the number of log entries for the email "test@org.com" for each month over last year
      Assume the following fields:
      - message`,
          expected: `FROM postgres-logs
       | GROK message "%{TIMESTAMP_ISO8601:timestamp} ip=%{IP:ip} email=%{EMAILADDRESS:email} userid=%{NUMBER:userid} [%{GREEDYDATA:log_message}]"
       | WHERE email == "test@org.com" AND timestamp > NOW() - 1 year
       | STATS COUNT(*) BY month = BUCKET(@timestamp, 1m)
       | SORT month`,
        },
      ],
    },
    {
      title: 'SPL to ESQL',
      tests: [
        {
          title: 'Converts a simple count query',
          question: `Can you convert this SPL query to ESQL? \`index=network_firewall "SYN Timeout" | stats count by dest\``,
          expected: `FROM network_firewall
      | WHERE _raw == "SYN Timeout"
      | STATS count = count(*) by dest`,
        },
        {
          title: 'Converts if/len to CASE/LENGTH',
          question: `Can you convert this SPL query to ESQL?
      \`index=prod_web
      | eval length=len(message)
      | eval k255=if((length>255),1,0)
      | eval k2=if((length>2048),1,0)
      | eval k4=if((length>4096),1,0)
      | eval k16=if((length>16384),1,0)
      | stats count, sum(k255), sum(k2),sum(k4),sum(k16), sum(length)\``,
          expected: `FROM prod_web
      | EVAL length = length(message), k255 = CASE(length > 255, 1, 0), k2 = CASE(length > 2048, 1, 0), k4 = CASE(length > 4096, 1, 0), k16 = CASE(length > 16384, 1, 0)
      | STATS COUNT(*), SUM(k255), SUM(k2), SUM(k4), SUM(k16), SUM(length)`,
          criteria: [
            'The query provided by the Assistant uses the ESQL functions LENGTH and CASE, not the SPL functions len and if',
          ],
        },
        {
          title: 'Converts matchers to NOT LIKE',
          question: `Can you convert this SPL query to ESQL?
      \`index=prod_web NOT "Connection reset" NOT "[acm-app] created a ThreadLocal"
      sourcetype!=prod_urlf_east_logs sourcetype!=prod_urlf_west_logs
      host!="dbs-tools-*" NOT "Public] in context with path [/global]"
      host!="*dev*" host!="*qa*" host!="*uat*"\``,
          expected: `FROM prod_web
      | WHERE _raw NOT LIKE "Connection reset"
      AND _raw NOT LIKE "[acm-app] created a ThreadLocal"
      AND sourcetype != "prod_urlf_east_logs"
      AND sourcetype != "prod_urlf_west_logs"
      AND host NOT LIKE "dbs-tools-*"
      AND _raw NOT LIKE "Public] in context with path [/global]"
      AND host NOT LIKE "*dev*"
      AND host NOT LIKE "*qa*"
      AND host NOT LIKE "*uat*"`,
        },
      ],
    },
  ];

  return testDefinitions;
};

const generateTestSuite = () => {
  const testDefinitions = buildTestDefinitions();
  for (const section of testDefinitions) {
    describe(`${section.title}`, () => {
      for (const test of section.tests) {
        (test.only ? it.only : it)(`${test.title}`, async () => {
          await evaluateEsqlQuery({
            question: test.question,
            expected: test.expected,
            criteria: test.criteria,
          });
        });
      }
    });
  }
};

generateTestSuite();
