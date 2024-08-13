/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import expect from '@kbn/expect';
import { lastValueFrom } from 'rxjs';
import { naturalLanguageToEsql } from '../../../../server/tasks/nl_to_esql';
import { chatClient, evaluationClient, logger } from '../../services';

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

  const generateEvent = await lastValueFrom(
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

  logger.debug(`Received resposne: ${generateEvent.content}`);

  const evaluation = await evaluationClient.evaluate(
    `# Question

    ${question}

    # Answer
    ${generateEvent.content}
    
    `,
    [
      ...(expected
        ? [
            `Returns a ES|QL query that is functionally equivalent to:      
      ${expected}. It's OK if column names are slightly different, as long as the expected end result is the same.`,
          ]
        : []),
      ...criteria,
    ]
  );

  expect(evaluation.passed).to.be(true);
}

describe('ES|QL query generation', () => {
  it('generates a query to show the top 10 domains by doc count', async () => {
    await evaluateEsqlQuery({
      question: `For standard Elastic ECS compliant packetbeat data view
          (\`packetbeat-*\`), show me the top 10 unique destination.domain
          with the most docs.
            
            Assume the following fields:
            - destination.domain
            `,
      expected: `FROM packetbeat-*
          | STATS doc_count = COUNT(*) BY destination.domain
          | SORT doc_count DESC
          | LIMIT 10`,
    });
  });

  it('generates a query to show the top 5 employees sorted ascending by hire date', async () => {
    await evaluateEsqlQuery({
      question:
        'From employees, I want to see the 5 earliest employees (hire_date), I want to display only the month and the year that they were hired in and their employee number (emp_no). Format the date as e.g. "September 2019".',
      expected: `FROM employees
        | EVAL hire_date_formatted = DATE_FORMAT("MMMM YYYY", hire_date)
        | SORT hire_date
        | KEEP emp_no, hire_date_formatted
        | LIMIT 5`,
    });
  });

  it('explains that pagination is not supported when requested', async () => {
    await evaluateEsqlQuery({
      question:
        'From employees, I want to sort the documents by `salary`, and then return 10 results per page, and then see the second page',
      criteria: [
        'The assistant should clearly mention that pagination is currently not supported in ES|QL. It might provide a workaround.',
      ],
    });
  });

  it('generates a query to extract the year and shows 10 employees that were hired in 2024', async () => {
    await evaluateEsqlQuery({
      question:
        'From employees, extract the year from hire_date and show 10 employees hired in 2024',
      expected: `FROM employees
        | WHERE DATE_EXTRACT("year", hire_date) == 2024
        | LIMIT 10`,
    });
  });

  it('generates a query to calculate the avg cpu usage over the last 15m per service', async () => {
    await evaluateEsqlQuery({
      question: `Assume my metrics data is in \`metrics-*\`. I want to see what
          a query would look like that gets the average CPU per service,
          limit it to the top 10 results, in 1m buckets, and only 
          the last 15m.
          
          Assume the following fields:
          - @timestamp
          - system.cpu.total.norm.pct
          - service.name`,
      expected: `FROM metrics-*
        | WHERE @timestamp >= NOW() - 15 minutes
        | STATS avg_cpu = AVG(system.cpu.total.norm.pct) BY BUCKET(@timestamp, 1m), service.name
        | SORT avg_cpu DESC
        | LIMIT 10`,
    });
  });

  it('generates a query to show normalized CPU per host', async () => {
    await evaluateEsqlQuery({
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
    });
  });

  it('generates a query using DISSECT to parse a postgres log message', async () => {
    await evaluateEsqlQuery({
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
    });

    describe('SPL to ESQL', () => {
      it('converts a simple count query', async () => {
        await evaluateEsqlQuery({
          question: `can you convert this SPL query to ESQL? \`index=network_firewall "SYN Timeout" | stats count by dest\``,
          expected: `FROM network_firewall
          | WHERE _raw == "SYN Timeout"
          | STATS count = count(*) by dest`,
        });
      });

      it('converts if/len to CASE/LENGTH', async () => {
        await evaluateEsqlQuery({
          question: `Can you convert this SPL query to ESQL?

          \`index=prod_web
            | eval length=len(message)
            | eval k255=if((length>255),1,0)
            | eval k2=if((length>2048),1,0)
            | eval k4=if((length>4096),1,0)
            | eval k16=if((length>16384),1,0)
            | stats count, sum(k255), sum(k2),sum(k4),sum(k16), sum(length)\`
          `,
          expected: `from prod_web
          | EVAL length = length(message), k255 = CASE(length > 255, 1, 0), k2 = CASE(length > 2048, 1, 0), k4 = CASE(length > 4096, 1, 0), k16 = CASE(length > 16384, 1, 0)
          | STATS COUNT(*), SUM(k255), SUM(k2), SUM(k4), SUM(k16), SUM(length)`,
          criteria: [
            'The query provided by the Assistant uses the ESQL functions LENGTH and CASE, not the SPL functions len and if',
          ],
        });
      });

      it('converts matchers to NOT LIKE', async () => {
        await evaluateEsqlQuery({
          question: `Can you convert this SPL query to ESQL?
            \`
            index=prod_web NOT "Connection reset" NOT "[acm-app] created a ThreadLocal" sourcetype!=prod_urlf_east_logs sourcetype!=prod_urlf_west_logs host!="dbs-tools-*" NOT "Public] in context with path [/global] " host!="*dev*" host!="*qa*" host!="*uat*"`,
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
        });
      });
    });
  });
});
