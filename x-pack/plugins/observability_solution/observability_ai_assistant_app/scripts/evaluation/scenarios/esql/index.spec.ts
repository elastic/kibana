/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import moment from 'moment';
import { chatClient, esClient, synthtraceEsClients } from '../../services';

async function evaluateEsqlQuery({
  question,
  expected,
  execute,
  criteria = [],
}: {
  question: string;
  expected?: string;
  execute?: boolean;
  criteria?: string[];
}): Promise<void> {
  const conversation = await chatClient.complete(question);

  const evaluation = await chatClient.evaluate(conversation, [
    ...(expected
      ? [
          `Returns a ES|QL query that is functionally equivalent to:      
      ${expected}. It's OK if column names are slightly different, as long as the expected end result is the same.`,
        ]
      : []),
    ...(execute
      ? [`The query successfully executed without an error`]
      : [`The query was not executed, it was only explained`]),
    ...criteria,
  ]);

  expect(evaluation.passed).to.be(true);

  return;
}

describe('ES|QL query generation', () => {
  describe('other queries', () => {
    describe('with packetbeat data', () => {
      before(async () => {
        await esClient.indices.create({
          index: 'packetbeat-8.11.3',
          mappings: {
            properties: {
              '@timestamp': {
                type: 'date',
              },
              destination: {
                type: 'object',
                properties: {
                  domain: {
                    type: 'keyword',
                  },
                },
              },
              url: {
                type: 'object',
                properties: {
                  domain: {
                    type: 'keyword',
                  },
                },
              },
            },
          },
        });
        await esClient.index({
          index: 'packetbeat-8.11.3',
          document: {
            '@timestamp': '2024-01-23T12:30:00.000Z',
            destination: {
              domain: 'observability.ai.assistant',
            },
            url: {
              domain: 'elastic.co',
            },
          },
        });
      });

      it('top 10 unique domains', async () => {
        await evaluateEsqlQuery({
          question:
            'For standard Elastic ECS compliant packetbeat data view, show me the top 10 unique destination.domain with the most docs',
          expected: `FROM packetbeat-*
          | STATS doc_count = COUNT(*) BY destination.domain
          | SORT doc_count DESC
          | LIMIT 10`,
          execute: true,
        });
      });

      after(async () => {
        await esClient.indices.delete({
          index: 'packetbeat-8.11.3',
          allow_no_indices: true,
        });
      });
    });

    describe('with employees data', () => {
      before(async () => {
        await esClient.indices.create({
          index: 'employees',
          mappings: {
            properties: {
              hire_date: {
                type: 'date',
              },
              emp_no: {
                type: 'integer',
              },
              salary: {
                type: 'integer',
              },
            },
          },
        });

        await esClient.index({
          index: 'employees',
          document: {
            hire_date: '2024-01-23T12:30:00.000Z',
            emp_no: 1,
            salary: 100,
          },
        });
      });

      it('employees five earliest', async () => {
        await evaluateEsqlQuery({
          question:
            'From employees, I want to see the 5 earliest employees (hire_date), I want to display only the month and the year that they were hired in and their employee number (emp_no). Format the date as e.g. "September 2019".',
          expected: `FROM employees
          | EVAL hire_date_formatted = DATE_FORMAT("MMMM YYYY", hire_date)
          | SORT hire_date
          | KEEP emp_no, hire_date_formatted
          | LIMIT 5`,
          execute: true,
        });
      });

      it('employees with pagination', async () => {
        await evaluateEsqlQuery({
          question:
            'From employees, I want to sort the documents by salary, and then return 10 results per page, and then see the second page',
          criteria: [
            'The assistant should clearly mention that pagination is currently not supported in ES|QL',
            'IF the assistant decides to execute the query, it should correctly execute, and the Assistant should clearly mention pagination is not currently supported',
          ],
        });
      });

      it('employee hire date', async () => {
        await evaluateEsqlQuery({
          question:
            'From employees, extract the year from hire_date and show 10 employees hired in 2024',
          expected: `FROM employees
          | WHERE DATE_EXTRACT("year", hire_date) == 2024
          | LIMIT 10`,
          execute: true,
        });
      });

      after(async () => {
        await esClient.indices.delete({
          index: 'employees',
        });
      });
    });

    it('logs avg cpu', async () => {
      await evaluateEsqlQuery({
        question:
          'Assume my metrics data is in `metrics-*`. I want to see what a query would look like that gets the average CPU per service, limit it to the top 10 results, in 1m buckets, and only include the last 15m.',
        expected: `FROM .ds-metrics-apm*
        | WHERE @timestamp >= NOW() - 15 minutes
        | EVAL bucket = DATE_TRUNC(1 minute, @timestamp)
        | STATS avg_cpu = AVG(system.cpu.total.norm.pct) BY bucket, service.name
        | SORT avg_cpu DESC
        | LIMIT 10`,
        execute: false,
      });
    });

    it('metricbeat avg cpu', async () => {
      await evaluateEsqlQuery({
        question: `Assume my data is in \`metricbeat*\`. Show me a query to see the percentage of CPU time (system.cpu.system.pct) normalized by the number of CPU cores (system.cpu.cores), broken down by host name`,
        expected: `FROM metricbeat*
      | EVAL system_pct_normalized = TO_DOUBLE(system.cpu.system.pct) / system.cpu.cores
      | STATS avg_system_pct_normalized = AVG(system_pct_normalized) BY host.name
      | SORT host.name ASC`,
        execute: false,
      });
    });

    it('postgres avg duration dissect', async () => {
      await evaluateEsqlQuery({
        question:
          'Show me an example ESQL query to extract the query duration from postgres log messages in postgres-logs*, with this format:\n `2021-01-01 00:00:00 UTC [12345]: [1-1] user=postgres,db=mydb,app=[unknown],client=127.0.0.1 LOG:  duration: 123.456 ms  statement: SELECT * FROM my_table`. \n Use ECS fields, and calculate the avg.',
        expected: `FROM postgres-logs*
      | DISSECT message "%{}:  duration: %{query_duration} ms  %{}"
      | EVAL duration_double = TO_DOUBLE(duration)
      | STATS AVG(duration_double)`,
        execute: false,
      });
    });
  });

  describe('APM queries', () => {
    before(async () => {
      const myServiceInstance = apm
        .service('my-service', 'production', 'go')
        .instance('my-instance');

      await synthtraceEsClients.apmSynthtraceEsClient.index(
        timerange(moment().subtract(15, 'minutes'), moment())
          .interval('1m')
          .rate(10)
          .generator((timestamp) =>
            myServiceInstance
              .transaction('GET /api')
              .timestamp(timestamp)
              .duration(50)
              .outcome('success')
          )
      );

      await synthtraceEsClients.apmSynthtraceEsClient.index(
        timerange(moment().subtract(15, 'minutes'), moment())
          .interval('1m')
          .rate(10)
          .generator((timestamp) =>
            myServiceInstance
              .transaction('GET /api')
              .timestamp(timestamp)
              .duration(50)
              .failure()
              .errors(
                myServiceInstance
                  .error({
                    message: '2024-11-15T13:12:00 - ERROR - duration: 12ms',
                    type: 'My Type',
                  })
                  .timestamp(timestamp)
              )
          )
      );
    });

    // histograms are not supported yet in ES|QL
    it.skip('metrics avg duration', async () => {
      await evaluateEsqlQuery({
        question:
          'Execute a query for metrics-apm*, filtering on metricset.name:service_transaction and metricset.interval:1m, the average duration (via transaction.duration.histogram), in 50 buckets.',
        execute: true,
      });
    });

    it('service inventory', async () => {
      await evaluateEsqlQuery({
        question:
          'I want to see a list of services with APM data. My data is in `traces-apm*`. I want to show the average transaction duration, the success rate (by dividing event.outcome:failure by event.outcome:failure+success), and total amount of requests. As a time range, select the last 24 hours. Use ES|QL.',
        expected: `FROM traces-apm*
      | WHERE @timestamp >= NOW() - 24 hours
      | EVAL is_failure = CASE(event.outcome == "failure", 1, 0), is_success = CASE(event.outcome == "success", 1, 0)
      | STATS total_requests = COUNT(*), avg_duration = AVG(transaction.duration.us), success_rate = SUM(is_success) / COUNT(*) BY service.name
      | KEEP service.name, avg_duration, success_rate, total_requests`,
        execute: true,
      });
    });

    it('exit span', async () => {
      await evaluateEsqlQuery({
        question: `I've got APM data in metrics-apm*. Show me a query that filters on metricset.name:service_destination and the last 24 hours. Break down by span.destination.service.resource. Each document contains the count of total events (span.destination.service.response_time.count) for that document's interval and the total amount of latency (span.destination.service.response_time.sum.us). A document either contains an aggregate of failed events (event.outcome:success) or failed events (event.outcome:failure). A single document might represent multiple failures or successes, depending on the value of span.destination.service.response_time.count. For each value of span.destination.service.resource, give me the average throughput, latency per request, and failure rate, as a value between 0 and 1.  Just show me the query.`,
        expected: `FROM metrics-apm
        | WHERE metricset.name == "service_destination" AND @timestamp >= NOW() - 24 hours
        | EVAL total_response_time = span.destination.service.response_time.sum.us / span.destination.service.response_time.count, total_failures = CASE(event.outcome == "failure", 1, 0) * span.destination.service.response_time.count
        | STATS
          avg_throughput = AVG(span.destination.service.response_time.count),
          avg_latency = AVG(total_response_time),
          failure_rate = AVG(total_failures)
          BY span.destination.service.resource`,
        execute: false,
      });
    });

    it('trace duration', async () => {
      await evaluateEsqlQuery({
        question:
          'My APM data is in .ds-traces-apm-default-*. Execute a query to find the average for `transaction.duration.us` per service over the last hour',
        expected: `FROM .ds-traces-apm-default-*
        | WHERE @timestamp > NOW() - 1 hour
        | STATS AVG(transaction.duration.us) BY service.name`,
        execute: true,
      });
    });

    it('error logs rate', async () => {
      await evaluateEsqlQuery({
        question: `i have logs in logs-apm*. Using ESQL, show me the error rate as a percetage of the error logs (identified as processor.event containing the value error) vs the total logs per day for the last 7 days `,
        expected: `FROM logs-apm*
        | WHERE @timestamp >= NOW() - 7 days
        | EVAL day = DATE_TRUNC(1 day, @timestamp)
        | EVAL error = CASE(processor.event == "error", 1, 0)
        | STATS total_logs = COUNT(*), total_errors = SUM(is_error) BY day
        | EVAL error_rate = total_errors / total_logs * 100
        | SORT day ASC`,
        execute: true,
      });
    });

    it('error message and date', async () => {
      await evaluateEsqlQuery({
        question:
          'From logs-apm*, I want to see the 5 latest messages using ESQL, I want to display only the date that they were indexed, processor.event and message. Format the date as e.g. "10:30 AM, 1 of September 2019".',
        expected: `FROM logs-apm*
        | SORT @timestamp DESC
        | EVAL formatted_date = DATE_FORMAT("hh:mm a, d 'of' MMMM yyyy", @timestamp)
        | KEEP formatted_date, processor.event, message
        | LIMIT 5`,
        execute: true,
        criteria: [
          'The Assistant uses KEEP, to make sure the AT LEAST the formatted date, processor event and message fields are displayed. More columns are fine, fewer are not',
        ],
      });
    });

    after(async () => {
      await synthtraceEsClients.apmSynthtraceEsClient.clean();
    });
  });

  describe('SPL queries', () => {
    it('network_firewall count by', async () => {
      await evaluateEsqlQuery({
        question: `can you convert this SPL query to ESQL? index=network_firewall "SYN Timeout" | stats count by dest`,
        expected: `FROM network_firewall
        | WHERE _raw == "SYN Timeout"
        | STATS count = count(*) by dest`,
        execute: false,
      });
    });
    it('prod_web length', async () => {
      await evaluateEsqlQuery({
        question: `can you convert this SPL query to ESQL? index=prod_web | eval length=len(message) | eval k255=if((length>255),1,0) | eval k2=if((length>2048),1,0) | eval k4=if((length>4096),1,0) |eval k16=if((length>16384),1,0) | stats count, sum(k255), sum(k2),sum(k4),sum(k16), sum(length)`,
        expected: `from prod_web
        | EVAL length = length(message), k255 = CASE(length > 255, 1, 0), k2 = CASE(length > 2048, 1, 0), k4 = CASE(length > 4096, 1, 0), k16 = CASE(length > 16384, 1, 0)
        | STATS COUNT(*), SUM(k255), SUM(k2), SUM(k4), SUM(k16), SUM(length)`,
        criteria: [
          'The query provided by the Assistant uses the ESQL functions LENGTH and CASE, not the SPL functions len and if',
        ],
        execute: false,
      });
    });
    it('prod_web filter message and host', async () => {
      await evaluateEsqlQuery({
        question: `can you convert this SPL query to ESQL? index=prod_web NOT "Connection reset" NOT "[acm-app] created a ThreadLocal" sourcetype!=prod_urlf_east_logs sourcetype!=prod_urlf_west_logs host!="dbs-tools-*" NOT "Public] in context with path [/global] " host!="*dev*" host!="*qa*" host!="*uat*"`,
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
        execute: false,
      });
    });
  });
});
