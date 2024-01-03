/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/// <reference types="@kbn/ambient-ftr-types"/>

import { last } from 'lodash';
import moment from 'moment';
import { apm, timerange } from '@kbn/apm-synthtrace-client';
import expect from '@kbn/expect';
import { MessageRole } from '../../../../common';
import { chatClient, esClient, synthtraceEsClients } from '../../services';

function extractEsqlQuery(response: string) {
  return response.match(/```esql([\s\S]*?)```/)?.[1];
}

async function evaluateEsqlQuery({
  question,
  expected,
  criteria = [],
  execute = true,
}: {
  question: string;
  expected?: string;
  criteria?: string[];
  execute?: boolean;
}): Promise<void> {
  let conversation = await chatClient.complete(question);

  const esqlQuery = extractEsqlQuery(last(conversation.messages)?.content || '');

  if (esqlQuery && execute) {
    conversation = await chatClient.complete(
      conversation.conversationId!,
      conversation.messages.concat({
        content: '',
        role: MessageRole.Assistant,
        function_call: {
          name: 'execute_query',
          arguments: JSON.stringify({
            query: esqlQuery,
          }),
          trigger: MessageRole.User,
        },
      })
    );
  }

  const evaluation = await chatClient.evaluate(conversation, [
    ...(expected
      ? [
          `Returns a ES|QL query that is functionally equivalent to:      
      ${expected}`,
        ]
      : []),
    ...(execute && expected ? [`The query successfully executed without an error`] : []),
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
      });

      it('top 10 unique domains', async () => {
        await evaluateEsqlQuery({
          question:
            'For standard Elastic ECS compliant packetbeat data view, create an ES|QL query that shows the top 10 unique domains by doc count',
          expected: `FROM packetbeat-*
          | STATS doc_count = COUNT(destination.domain) BY destination.domain
          | SORT doc_count DESC
          | LIMIT 10`,
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
      });

      it('five earliest employees', async () => {
        await evaluateEsqlQuery({
          question:
            'From employees, I want to see the 5 earliest employees (hire_date), I want to display only the month and the year that they were hired in and their employee number (emp_no). Format the date as e.g. "September 2019".',
          expected: `FROM employees
          | EVAL hire_date_formatted = DATE_FORMAT(hire_date, ""MMMM yyyy"")
          | SORT hire_date
          | KEEP emp_no, hire_date_formatted
          | LIMIT 5`,
          execute: false,
        });
      });

      it('employees with pagination', async () => {
        await evaluateEsqlQuery({
          question:
            'From employees, I want to sort the documents by salary, and then return 10 results per page, and then see the second page',
          criteria: [
            'The assistant should mention that pagination is currently not supported in ES|QL',
          ],
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
          'My logs data (ECS) is in `logs-*`. Show me a query that gets the average CPU per host, limit it to the top 10 results, in 1m buckets, and only include the last 15m. ',
        expected: `FROM logs-*
        | WHERE @timestamp >= NOW() - 15 minutes
        | EVAL bucket = DATE_TRUNC(1 minute, @timestamp)
        | STATS avg_cpu = AVG(system.cpu.total.norm.pct) BY bucket, host.name
        | LIMIT 10`,
      });
    });

    it('metricbeat avg cpu', async () => {
      await evaluateEsqlQuery({
        question: `from \`metricbeat*\`, using ES|QL, I want to see the percentage of CPU time normalized by the number of CPU cores, broken down by hostname. the fields are system.cpu.user.pct, system.cpu.system.pct, and system.cpu.cores`,
        expected: `FROM metricbeat*
        | EVAL cpu_pct_normalized = (system.cpu.user.pct + system.cpu.system.pct) / system.cpu.cores
        | STATS AVG(cpu_pct_normalized) BY host.name`,
      });
    });

    it('postgres avg duration', async () => {
      await evaluateEsqlQuery({
        question:
          'extract the query duration from postgres log messages in postgres-logs*, using ECS fields, and calculate the avg',
        expected: `FROM postgres-logs
        | DISSECT message "%{} duration: %{query_duration} ms"
        | EVAL query_duration_num = TO_DOUBLE(query_duration)
        | STATS avg_duration = AVG(query_duration_num)`,
      });
    });

    it('high cardinality logs', async () => {
      await evaluateEsqlQuery({
        question: `i have logs in high-cardinality-data-fake_stack.admin-console-* . errors are found when log.level contais the value ERROR. generate a query to obtain the error rate as a percetage of the total logs per day for the last 7 days`,
        expected: `FROM high-cardinality-data-fake_stack.admin-console-*
        | WHERE @timestamp >= NOW() - 7 days
        | EVAL error = CASE(log.level == "ERROR", 1, 0), total = 1
        | EVAL bucket = DATE_TRUNC(1 day, @timestamp)
        | STATS total_errors = SUM(error), total_logs = SUM(total) BY bucket
        | EVAL error_rate = (total_errors / total_logs) * 100`,
      });
    });

    it('nyc taxis dropoff time', async () => {
      await evaluateEsqlQuery({
        question:
          'From `nyc_taxis`, give me a query that shows the top 10 results where the drop off time was between 6am and 10am.',
        expected: `FROM nyc_taxis
        | WHERE DATE_EXTRACT(drop_off_time, "hour") >= 6 AND DATE_EXTRACT(drop_off_time, "hour") < 10
        | LIMIT 10`,
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
    });

    it('metrics avg duration', async () => {
      await evaluateEsqlQuery({
        question:
          'I want to see a query for metrics-apm*, filtering on metricset.name:transaction and metricset.interval:1m, showing the average duration (via transaction.duration.histogram), in 50 buckets.',
        expected: `FROM metrics-apm*
        | WHERE metricset.name == "transaction" AND metricset.interval == "1m"
        | EVAL bucket = AUTO_BUCKET(@timestamp, 50, <start-date>, <end-date>)
        | STATS avg_duration = AVG(transaction.duration.histogram) BY bucket`,
      });
    });

    it('service inventory', async () => {
      await evaluateEsqlQuery({
        question:
          'I want to show a list of services with APM data. My data is in `traces-apm*`. I want to show the average transaction duration, the success rate (by dividing event.outcome:failure by event.outcome:failure+success), and total amount of requests. As a time range, select the last 24 hours. Use ES|QL.',
        expected: `FROM traces-apm*
        | WHERE @timestamp >= NOW() - 24 hours
        | EVAL successful = CASE(event.outcome == "success", 1, 0),
          failed = CASE(event.outcome == "failure", 1, 0)
        | STATS success_rate = AVG(successful),
          avg_duration = AVG(transaction.duration),
          total_requests = COUNT(transaction.id) BY service.name`,
      });
    });

    it('exit span', async () => {
      await evaluateEsqlQuery({
        question: `I've got APM data in \`metrics-apm\`. Filter on \`metricset.name:service_destination\` and the last 24 hours. Break down by span.destination.service.resource. Each document contains the count of total events (span.destination.service.response_time.count) for that document's interval and the total amount of latency (span.destination.service.response_time.sum.us). A document either contains an aggregate of failed events (event.outcome:success) or failed events (event.outcome:failure). A single document might represent multiple failures or successes, depending on the value of span.destination.service.response_time.count. For each value of span.destination.service.resource, give me the average throughput, latency per request, and failure rate, as a value between 0 and 1.  Just show me the query.`,
        expected: `FROM metrics-apm
        | WHERE metricset.name == "service_destination" AND @timestamp >= NOW() - 24 hours
        | EVAL total_response_time = span.destination.service.response_time.sum.us / span.destination.service.response_time.count, total_failures = CASE(event.outcome == "failure", 1, 0) * span.destination.service.response_time.count
        | STATS
          avg_throughput = AVG(span.destination.service.response_time.count),
          avg_latency = AVG(total_response_time),
          failure_rate = AVG(total_failures)
          BY span.destination.service.resource`,
      });
    });

    it('trace duration', async () => {
      await evaluateEsqlQuery({
        question:
          'My APM data is in `traces-apm*`. What’s the average for `transaction.duration.us` per service over the last hour?',
        expected: `FROM traces-apm*
        | WHERE @timestamp > NOW() - 1 hour
        | STATS AVG(transaction.duration.us) BY service.name`,
      });
    });

    after(async () => {
      await synthtraceEsClients.apmSynthtraceEsClient.clean();
    });
  });
});
