/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import { DefaultEvaluators } from '@kbn/evals';
import { KibanaPhoenixClient } from '@kbn/evals/src/kibana_phoenix_client/client';
import { EvaluationDataset } from '@kbn/evals/src/types';
import moment from 'moment';
import { ObservabilityAIAssistantEvaluationChatClient } from '../../src/chat_client';
import { evaluate } from '../../src/evaluate';

interface EsqlExample extends Example {
  input: {
    question: string;
  };
  output: {
    expected?: string;
    criteria?: string[];
    execute?: boolean;
  };
}

async function evaluateEsqlDataset({
  dataset: { name, description, examples },
  chatClient,
  evaluators,
  phoenixClient,
}: {
  dataset: {
    name: string;
    description: string;
    examples: EsqlExample[];
  };
  chatClient: ObservabilityAIAssistantEvaluationChatClient;
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
}) {
  const dataset = {
    name,
    description,
    examples,
  } satisfies EvaluationDataset;

  await phoenixClient.runExperiment(
    {
      dataset,
      task: async ({ input }) => {
        const response = await chatClient.complete({
          messages: input.question,
        });

        return {
          errors: response.errors,
          messages: response.messages,
        };
      },
    },
    [
      {
        name: 'foo',
        kind: 'LLM',
        evaluate: async ({ input, output, expected, metadata }) => {
          const result = await evaluators
            .criteria([
              ...(expected.expected
                ? [
                    `Returns a ES|QL query that is functionally equivalent to:
      ${expected.expected}. It's OK if the created column names are slightly different, as long as the expected end result is the same.`,
                  ]
                : []),
              ...(expected.execute
                ? ['The query successfully executed without an error']
                : ['The query was not executed, it was only explained']),
              ...[],
            ])
            .evaluate({
              input,
              expected,
              output,
              metadata,
            });

          return result;
        },
      },
    ]
  );
}

evaluate.describe('ES|QL query generation', { tag: '@svlOblt' }, () => {
  evaluate('without data', async ({ chatClient, evaluators, phoenixClient }) => {
    await evaluateEsqlDataset({
      chatClient,
      evaluators,
      phoenixClient,
      dataset: {
        name: 'esql: without data',
        description: 'ES|QL query generation without any data or mappings',
        examples: [
          {
            input: {
              question:
                'Assume my metrics data is in `metrics-*`. I want to see what a query would look like that gets the average CPU per service, limit it to the top 10 results, in 1m buckets, and only include the last 15m.',
            },
            output: {
              expected: `FROM .ds-metrics-apm*
        | WHERE @timestamp >= NOW() - 15 minutes
        | STATS avg_cpu = AVG(system.cpu.total.norm.pct) BY BUCKET(@timestamp, 1m), service.name
        | SORT avg_cpu DESC
        | LIMIT 10`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Assume my data is in \`metricbeat*\`. Show me a query to see the percentage of CPU time (system.cpu.system.pct) normalized by the number of CPU cores (system.cpu.cores), broken down by host name`,
            },
            output: {
              expected: `FROM metricbeat*
      | EVAL system_pct_normalized = TO_DOUBLE(system.cpu.system.pct) / system.cpu.cores
      | STATS avg_system_pct_normalized = AVG(system_pct_normalized) BY host.name
      | SORT host.name ASC`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question:
                'Show me an example ESQL query to extract the query duration from postgres log messages in postgres-logs*, with this format:\n `2021-01-01 00:00:00 UTC [12345]: [1-1] user=postgres,db=mydb,app=[unknown],client=127.0.0.1 LOG:  duration: 123.456 ms  statement: SELECT * FROM my_table`. \n Use ECS fields, and calculate the avg.',
            },
            output: {
              expected: `FROM postgres-logs*
      | DISSECT message "%{}:  duration: %{query_duration} ms  %{}"
      | EVAL duration_double = TO_DOUBLE(duration)
      | STATS AVG(duration_double)`,
              execute: false,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate.describe('other queries', () => {
    evaluate.describe('with packetbeat data', () => {
      evaluate.beforeAll(async ({ esClient }) => {
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

      evaluate('queries', async ({ phoenixClient, evaluators, chatClient }) => {
        await evaluateEsqlDataset({
          dataset: {
            name: 'esql: with packetbeat data',
            description: 'Packetbeat question/query pairs',
            examples: [
              {
                input: {
                  question:
                    'For standard Elastic ECS compliant packetbeat data view, show me the top 10 unique destination.domain with the most docs',
                },
                output: {
                  expected: `FROM packetbeat-*
          | STATS doc_count = COUNT(*) BY destination.domain
          | SORT doc_count DESC
          | LIMIT 10`,
                  execute: true,
                },
                metadata: {},
              },
            ],
          },
          chatClient,
          evaluators,
          phoenixClient,
        });
      });

      evaluate.afterAll(async ({ esClient }) => {
        await esClient.indices.delete({
          index: 'packetbeat-8.11.3',
          allow_no_indices: true,
        });
      });
    });
  });

  evaluate.describe('with employee data', () => {
    evaluate.describe('with employees data', () => {
      evaluate.beforeAll(async ({ esClient }) => {
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

      evaluate('queries', async ({ phoenixClient, evaluators, chatClient }) => {
        await evaluateEsqlDataset({
          phoenixClient,
          chatClient,
          evaluators,
          dataset: {
            name: 'esql: with `employees` data',
            description: 'ES|QL questions with `employees` data + mappings',
            examples: [
              {
                input: {
                  question:
                    'From employees, I want to see the 5 earliest employees (hire_date), I want to display only the month and the year that they were hired in and their employee number (emp_no). Format the date as e.g. "September 2019".',
                },
                output: {
                  expected: `FROM employees
          | EVAL hire_date_formatted = DATE_FORMAT("MMMM YYYY", hire_date)
          | SORT hire_date
          | KEEP emp_no, hire_date_formatted
          | LIMIT 5`,
                  execute: true,
                },
                metadata: {},
              },
              {
                input: {
                  question:
                    'From employees, I want to sort the documents by salary, and then return 10 results per page, and then see the second page',
                },
                output: {
                  expected: `FROM employees
          | EVAL hire_date_formatted = DATE_FORMAT("MMMM YYYY", hire_date)
          | SORT hire_date
          | KEEP emp_no, hire_date_formatted
          | LIMIT 5`,
                  execute: true,
                  criteria: [
                    'The assistant should clearly mention that pagination is currently not supported in ES|QL',
                    'IF the assistant decides to execute the query, it should correctly execute, and the Assistant should clearly mention pagination is not currently supported',
                  ],
                },
                metadata: {},
              },
              {
                input: {
                  question:
                    'From employees, extract the year from hire_date and show 10 employees hired in 2024',
                },
                output: {
                  expected: `FROM employees
          | WHERE DATE_EXTRACT("year", hire_date) == 2024
          | LIMIT 10`,
                  execute: true,
                },
                metadata: {},
              },
            ],
          },
        });
      });

      evaluate.afterAll(async ({ esClient }) => {
        await esClient.indices.delete({
          index: 'employees',
        });
      });
    });
  });

  evaluate.describe('with APM data', () => {
    evaluate.beforeAll(async ({ apmSynthtraceEsClient }) => {
      const myServiceInstance = apm
        .service('my-service', 'production', 'go')
        .instance('my-instance');

      await apmSynthtraceEsClient.index(
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

      await apmSynthtraceEsClient.index(
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

    evaluate('queries', async ({ evaluators, chatClient, phoenixClient }) => {
      await evaluateEsqlDataset({
        evaluators,
        chatClient,
        phoenixClient,
        dataset: {
          name: 'esql: with apm data',
          description: 'ES|QL examples for APM data',
          examples: [
            {
              input: {
                question:
                  'I want to see a list of services with APM data. My data is in `traces-apm*`. I want to show the average transaction duration, the success rate (by dividing event.outcome:failure by event.outcome:failure+success), and total amount of requests. As a time range, select the last 24 hours. Use ES|QL.',
              },
              output: {
                expected: `FROM traces-apm*
      | WHERE @timestamp >= NOW() - 24 hours
      | EVAL is_failure = CASE(event.outcome == "failure", 1, 0), is_success = CASE(event.outcome == "success", 1, 0)
      | STATS total_requests = COUNT(*), avg_duration = AVG(transaction.duration.us), success_rate = SUM(is_success) / COUNT(*) BY service.name
      | KEEP service.name, avg_duration, success_rate, total_requests`,
                execute: true,
              },
              metadata: {},
            },
            {
              input: {
                question: `I've got APM data in metrics-apm*. Show me a query that filters on metricset.name:service_destination and the last 24 hours. Break down by span.destination.service.resource. Each document contains the count of total events (span.destination.service.response_time.count) for that document's interval and the total amount of latency (span.destination.service.response_time.sum.us). A document either contains an aggregate of failed events (event.outcome:success) or failed events (event.outcome:failure). A single document might represent multiple failures or successes, depending on the value of span.destination.service.response_time.count. For each value of span.destination.service.resource, give me the average throughput, latency per request, and failure rate, as a value between 0 and 1.  Just show me the query.`,
              },
              output: {
                expected: `FROM metrics-apm
        | WHERE metricset.name == "service_destination" AND @timestamp >= NOW() - 24 hours
        | EVAL total_response_time = span.destination.service.response_time.sum.us / span.destination.service.response_time.count, total_failures = CASE(event.outcome == "failure", 1, 0) * span.destination.service.response_time.count
        | STATS
          avg_throughput = AVG(span.destination.service.response_time.count),
          avg_latency = AVG(total_response_time),
          failure_rate = AVG(total_failures)
          BY span.destination.service.resource`,
                execute: false,
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'My APM data is in .ds-traces-apm-default-*. Execute a query to find the average for `transaction.duration.us` per service over the last hour',
              },
              output: {
                expected: `FROM .ds-traces-apm-default-*
        | WHERE @timestamp > NOW() - 1 hour
        | STATS AVG(transaction.duration.us) BY service.name`,
                execute: true,
              },
              metadata: {},
            },
            {
              input: {
                question: `i have logs in logs-apm*. Using ESQL, show me the error rate as a percetage of the error logs (identified as processor.event containing the value error) vs the total logs per day for the last 7 days `,
              },
              output: {
                expected: `FROM logs-apm*
        | WHERE @timestamp >= NOW() - 7 days
        | EVAL error = CASE(processor.event == "error", 1, 0)
        | STATS total_logs = COUNT(*), total_errors = SUM(is_error) BY BUCKET(@timestamp, 1 day)
        | EVAL error_rate = total_errors / total_logs * 100
        | SORT day ASC`,
                execute: true,
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'From logs-apm*, I want to see the 5 latest messages using ESQL, I want to display only the date that they were indexed, processor.event and message. Format the date as e.g. "10:30 AM, 1 of September 2019".',
              },
              output: {
                expected: `FROM logs-apm*
        | SORT @timestamp DESC
        | EVAL formatted_date = DATE_FORMAT("hh:mm a, d 'of' MMMM yyyy", @timestamp)
        | KEEP formatted_date, processor.event, message
        | LIMIT 5`,
                execute: true,
                criteria: [
                  'The Assistant uses KEEP, to make sure the AT LEAST the formatted date, processor event and message fields are displayed. More columns are fine, fewer are not',
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });

    evaluate.afterAll(async ({ apmSynthtraceEsClient }) => {
      await apmSynthtraceEsClient.clean();
    });
  });

  evaluate('SPL queries', async ({ chatClient, evaluators, phoenixClient }) => {
    await evaluateEsqlDataset({
      dataset: {
        name: 'esql: from SPL',
        description: '',
        examples: [
          {
            input: {
              question: `can you convert this SPL query to ESQL? index=network_firewall "SYN Timeout" | stats count by dest`,
            },
            output: {
              expected: `FROM network_firewall
        | WHERE _raw == "SYN Timeout"
        | STATS count = count(*) by dest`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `can you convert this SPL query to ESQL? index=prod_web | eval length=len(message) | eval k255=if((length>255),1,0) | eval k2=if((length>2048),1,0) | eval k4=if((length>4096),1,0) |eval k16=if((length>16384),1,0) | stats count, sum(k255), sum(k2),sum(k4),sum(k16), sum(length)`,
            },
            output: {
              expected: `from prod_web
        | EVAL length = length(message), k255 = CASE(length > 255, 1, 0), k2 = CASE(length > 2048, 1, 0), k4 = CASE(length > 4096, 1, 0), k16 = CASE(length > 16384, 1, 0)
        | STATS COUNT(*), SUM(k255), SUM(k2), SUM(k4), SUM(k16), SUM(length)`,
              criteria: [
                'The query provided by the Assistant uses the ESQL functions LENGTH and CASE, not the SPL functions len and if',
              ],
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `can you convert this SPL query to ESQL? index=prod_web NOT "Connection reset" NOT "[acm-app] created a ThreadLocal" sourcetype!=prod_urlf_east_logs sourcetype!=prod_urlf_west_logs host!="dbs-tools-*" NOT "Public] in context with path [/global] " host!="*dev*" host!="*qa*" host!="*uat*"`,
            },
            output: {
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
            },
            metadata: {},
          },
        ],
      },
      chatClient,
      evaluators,
      phoenixClient,
    });
  });
});
