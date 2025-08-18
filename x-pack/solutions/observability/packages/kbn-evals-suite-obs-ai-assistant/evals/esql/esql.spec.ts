/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateEsqlDataset } from './evaluate_esql_dataset';
import { createEvaluateEsqlDataset } from './evaluate_esql_dataset';
import {
  generateApacheErrorSpikeLogs,
  generateCorrelationIdLog,
  generateFrequentErrorLogs,
  generateHttpStatusLogs,
  generateNginxLatencyLogs,
  generatePodRestartLogs,
  generateServiceErrorRateLogs,
  generateUniqueUserLoginLogs,
} from '../../src/data_generators/logs';
import { generatePacketbeatData } from '../../src/data_generators/packetbeat';
import { generateApmData, generateCustomApmLogs } from '../../src/data_generators/apm';

// Base evaluation setup extended with the custom ES|QL dataset evaluator
const evaluate = base.extend<{
  evaluateEsqlDataset: EvaluateEsqlDataset;
}>({
  evaluateEsqlDataset: [
    ({ chatClient, evaluators, phoenixClient }, use) => {
      use(
        createEvaluateEsqlDataset({
          chatClient,
          evaluators,
          phoenixClient,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('ES|QL query generation', { tag: '@svlOblt' }, () => {
  // --- Test Suite for Logs Data ---
  evaluate.describe('with Logs data', () => {
    evaluate.beforeAll(async ({ logsSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();

      await Promise.all([
        generateFrequentErrorLogs({
          logsSynthtraceEsClient,
          dataset: 'my_app',
          errorMessages: {
            'ERROR: Database connection timed out': 50,
            'ERROR: Null pointer exception at com.example.UserService': 35,
            'ERROR: Payment gateway returned status 503': 20,
            'ERROR: Invalid API key provided': 15,
            'ERROR: Disk space is critically low': 10,
          },
        }),
        generateNginxLatencyLogs({
          logsSynthtraceEsClient,
          dataset: 'nginx.access',
          count: 500,
          services: ['api-gateway', 'user-service', 'billing-service'],
        }),
        generateApacheErrorSpikeLogs({
          logsSynthtraceEsClient,
          dataset: 'apache.error',
          errorMessage:
            '[client 127.0.0.1:1234] AH00128: File does not exist: /var/www/html/favicon.ico',
        }),
        generateUniqueUserLoginLogs({
          logsSynthtraceEsClient,
          dataset: 'auth_service',
          userPool: ['alice', 'bob', 'charlie', 'diana', 'edward', 'fiona'],
          days: 7,
        }),
        generateServiceErrorRateLogs({
          logsSynthtraceEsClient,
          dataset: 'my_service_app',
          serviceName: 'my-service',
          hours: 6,
          intervalMinutes: 5,
          errorRatio: 0.4,
        }),
        generatePodRestartLogs({
          logsSynthtraceEsClient,
          minutesAgo: 30,
        }),
        generateCorrelationIdLog({
          logsSynthtraceEsClient,
          minutesAgo: 10,
        }),
        generateHttpStatusLogs({
          logsSynthtraceEsClient,
          dataset: 'nginx.access',
          count: 1000,
        }),
      ]);
    });

    evaluate.afterAll(async ({ logsSynthtraceEsClient, esClient }) => {
      // Clean up generated log data
      await logsSynthtraceEsClient.clean();

      const catResponse = await esClient.cat.indices({
        index: 'logs-*',
        format: 'json',
        h: 'index',
      });

      const indicesToDelete = catResponse
        .map((i: { index?: string }) => i.index)
        .filter((index): index is string => Boolean(index));

      if (indicesToDelete.length > 0) {
        await esClient.indices.delete({
          index: indicesToDelete,
          allow_no_indices: true,
        });
      }
    });

    evaluate('Log data queries', async ({ evaluateEsqlDataset }) => {
      await evaluateEsqlDataset({
        dataset: {
          name: 'esql: with logs data',
          description: 'ES|QL questions against various generated log datasets.',
          examples: [
            {
              input: {
                question:
                  'From logs-my_app-*, show the 20 most frequent error messages in the last six hours.',
              },
              output: {
                expected: `FROM logs-my_app-*
                | WHERE @timestamp >= NOW() - 6 hours AND log.level == "error"
                | STATS error_count = COUNT(*) BY message
                | SORT error_count DESC
                | LIMIT 20`,
                execute: true,
                criteria: [
                  `The results should include error counts for the following errors:
                    - ERROR: Database connection timed out
                    - ERROR: Null pointer exception at com.example.UserService
                    - ERROR: Payment gateway returned status 503
                    - ERROR: Invalid API key provided
                    - ERROR: Disk space is critically low`,
                ],
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'Show the total count of error-level logs from all log datasets in the last 24 hours, grouped by dataset.',
              },
              output: {
                expected: `FROM logs-*
                | WHERE @timestamp >= NOW() - 24 hours AND log.level == "error"
                | STATS error_count = COUNT(*) BY data_stream.dataset
                | SORT error_count DESC`,
                execute: true,
                criteria: [
                  `Should identify errors in 'apache.error', 'my_app', 'my_service_app' and 'my_test_app' datasets.`,
                  'The highest number of errors should be in in the apache.error dataset',
                  'The lowest number of errors should be in in the my_test_app dataset',
                ],
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'Generate a query to calculate hourly error rate for my-service in logs-* over the last 6 hours as a percentage and execute it.',
              },
              output: {
                expected: `FROM logs-*
                | WHERE @timestamp >= NOW() - 6 hours AND service.name == "my-service"
                | EVAL is_error = CASE(log.level == "error", 1, 0)
                | STATS total = COUNT(*), errors = SUM(is_error) BY BUCKET(@timestamp, 1h)
                | EVAL error_rate_pct = TO_DOUBLE(errors) / total * 100`,
                execute: true,
                criteria: [
                  'The total number of logs in each full one-hour bucket should be 12.',
                  'The number of errors in each bucket should be between 0 and 12, inclusive.',
                  'The error rate percentage should be correctly calculated based on total and errors.',
                ],
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'What is the average request time in milliseconds for Nginx services over the last 2 hours?',
              },
              output: {
                expected: `FROM logs-nginx.access-*
                | WHERE @timestamp >= NOW() - 2 hours
                | GROK message "%{GREEDYDATA} %{NUMBER:request_time}"
                | STATS average_request_time_ms = AVG(TO_DOUBLE(request_time) * 1000)`,
                execute: true,
              },
              metadata: {},
            },
            {
              input: {
                question:
                  "Find the top 5 slowest Nginx requests for the 'api-gateway' service in the last two hours.",
              },
              output: {
                expected: `FROM logs-nginx.access-*
                | WHERE @timestamp >= NOW() - 2 hours AND service.name == "api-gateway"
                | DISSECT message "%{} %{} %{} %{} %{} %{} %{} %{} %{} %{} %{request_time}"
                | EVAL request_time_s = TO_DOUBLE(request_time)
                | SORT request_time_s DESC
                | LIMIT 5
                | KEEP @timestamp, message, request_time_s`,
                execute: true,
                criteria: ['Identifies the top 5 slowest requests.'],
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'Show logs from Kubernetes pods that have restarted in the last 24 hours.',
              },
              output: {
                expected: `FROM logs-*
                | WHERE @timestamp >= NOW() - 24 hours AND kubernetes.pod.restart_count > 0
                | KEEP kubernetes.pod.restart_count`,
                execute: true,
                criteria: ['The restart count should be identified as 2.'],
              },
              metadata: {},
            },
            {
              input: {
                question: 'Find all log entries with correlation id abc123.',
              },
              output: {
                expected: `FROM logs-*
                | WHERE trace.id == "abc123"`,
                execute: true,
                criteria: ['Should retrieve 1 log with the trace ID abc123.'],
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'Count the number of apache errors per 10-minute interval over the last 6 hours to find any anomalies.',
              },
              output: {
                expected: `FROM logs-apache.error-*
                | WHERE @timestamp >= NOW() - 6 hours AND log.level == "error"
                | STATS error_count = COUNT(*) by BUCKET(@timestamp, 600s)
                | SORT \`BUCKET(@timestamp, 600s)\` ASC`,
                execute: true,
                criteria: [
                  'The response after query execution should include error count by 10-minute time intervals',
                  '2 time intervals should have high error counts, while the rest should be low error counts',
                ],
              },
              metadata: {},
            },
            {
              input: {
                question: 'How many unique users logged in each day over the last 7 days?',
              },
              output: {
                expected: `FROM logs-auth_service-*
                | WHERE @timestamp >= NOW() - 7 days AND event.action == "login"
                | STATS unique_users = COUNT_DISTINCT(user.id) BY BUCKET(@timestamp, 1d)
                | SORT \`BUCKET(@timestamp, 1d)\` ASC`,
                execute: true,
              },
              metadata: {},
            },
            {
              input: {
                question: 'List users who logged in more than 5 times in the last 3 days.',
              },
              output: {
                expected: `FROM logs-auth_service-*
                | WHERE @timestamp >= NOW() - 3 days AND event.action == "login"
                | STATS login_count = COUNT(user.id) BY user.id
                | WHERE login_count > 5
                | SORT login_count DESC`,
                execute: true,
                criteria: [
                  'The result should display the login count for each user who logged in more than 5 times',
                ],
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'What is the total number of login events, and how many of those occurred during the hour before last? (Total count vs count last hour)',
              },
              output: {
                expected: `FROM logs-auth_service-*
                | SORT @timestamp
                | EVAL now = NOW()
                | EVAL key = CASE(@timestamp < (now - 1 hour) AND @timestamp > (now - 2 hour), "Last hour", "Other")
                | STATS count = COUNT(*) BY key
                | EVAL count_last_hour = CASE(key == "Last hour", count), count_rest = CASE(key == "Other", count)
                | EVAL total_visits = TO_DOUBLE(COALESCE(count_last_hour, 0::LONG) + COALESCE(count_rest, 0::LONG))
                | STATS count_last_hour = SUM(count_last_hour), total_visits  = SUM(total_visits)`,
                execute: true,
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'Show a breakdown of successful (status < 400) and unsuccessful (status >= 400) requests from nginx.access logs over the last 24 hours.',
              },
              output: {
                expected: `FROM logs-nginx.access-*
                | WHERE @timestamp >= NOW() - 24 hours
                | EVAL status_type = CASE(http.response.status_code >= 400, "Error (>=400)", "Success (<400)")
                | STATS count = COUNT(*) BY status_type`,
                execute: true,
                criteria: [
                  'The result should include 2 rows for successful and error counts',
                  'The successful http responses count should be higher than error error http responses count',
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });
  });

  // --- Test Suite for APM Data ---
  evaluate.describe('with APM data', () => {
    evaluate.beforeAll(async ({ logsSynthtraceEsClient, apmSynthtraceEsClient }) => {
      await generateApmData({ apmSynthtraceEsClient });
      await generateCustomApmLogs({
        logsSynthtraceEsClient,
      });
    });

    evaluate.afterAll(async ({ logsSynthtraceEsClient, apmSynthtraceEsClient }) => {
      await logsSynthtraceEsClient.clean();
      await apmSynthtraceEsClient.clean();
    });

    evaluate('APM data queries', async ({ evaluateEsqlDataset }) => {
      await evaluateEsqlDataset({
        dataset: {
          name: 'esql: with APM data',
          description: 'ES|QL examples for APM data.',
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
                | STATS total_requests = COUNT(*), avg_duration = AVG(transaction.duration.us), success_rate = TO_DOUBLE(SUM(is_success)) / COUNT(*) BY service.name
                | KEEP service.name, avg_duration, success_rate, total_requests`,
                execute: true,
                criteria: [
                  "The result should contain one row for the service 'my-apm-service'.",
                  "For 'my-apm-service', the total requests should be approximately 28,780",
                  'The average duration should be approximately 50,000',
                  'The success rate should now be correctly calculated as 0.5.',
                ],
              },
              metadata: {},
            },
            {
              input: {
                question: `I've got APM data in metrics-apm*. Show me a query that filters on metricset.name:service_destination and the last 24 hours. Break down by span.destination.service.resource. Each document contains the count of total events (span.destination.service.response_time.count) for that document's interval and the total amount of latency (span.destination.service.response_time.sum.us). A document either contains an aggregate of failed events (event.outcome:success) or failed events (event.outcome:failure). A single document might represent multiple failures or successes, depending on the value of span.destination.service.response_time.count. For each value of span.destination.service.resource, give me the average throughput, latency per request, and failure rate, as a value between 0 and 1. Just show me the query.`,
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
                  'My APM data is in traces-apm*. Execute a query to find the average for `transaction.duration.us` per service over the last hour',
              },
              output: {
                expected: `FROM traces-apm*
                | WHERE @timestamp > NOW() - 1 hour
                | STATS AVG(transaction.duration.us) BY service.name`,
                execute: true,
                criteria: ['The average duration should be 50,000 for the my-apm-service'],
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'I have logs in logs-apm*. Using ES|QL, show me the error rate as a percentage of the error logs (identified as processor.event containing the value error) vs the total logs per day for the last 7 days.',
              },
              output: {
                expected: `FROM logs-apm*
                | WHERE @timestamp >= NOW() - 7 days
                | EVAL error = CASE(processor.event == "error", 1, 0)
                | STATS total_logs = COUNT(*), total_errors = SUM(error) BY BUCKET(@timestamp, 1 day)
                | EVAL error_rate = TO_DOUBLE(total_errors) / total_logs * 100
                | SORT \`BUCKET(@timestamp, 1 day)\` ASC`,
                execute: true,
                criteria: [
                  'The total error count for the most recent day should be 10610.',
                  'The calculated error rate for that day should be approximately 50.',
                ],
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'From logs-apm.error-*, I want to see the 5 latest messages using ES|QL, I want to display only the date that they were indexed, processor.event and message. Format the date as e.g. "10:30 AM, 1 of September 2019".',
              },
              output: {
                expected: `FROM logs-apm.error-*
                | SORT @timestamp DESC
                | EVAL formatted_date = DATE_FORMAT("hh:mm a, d 'of' MMMM yyyy", @timestamp)
                | KEEP formatted_date, processor.event, message
                | LIMIT 5`,
                execute: true,
                criteria: [
                  'The assistant uses KEEP, to make sure AT LEAST the formatted date, processor event and the message fields are displayed. More columns are fine, fewer are not',
                  'The assistant should retrieve exactly 5 rows',
                  `The field that includes the message should have '2024-11-15T13:12:00 - ERROR - duration: 12ms'`,
                ],
              },
              metadata: {},
            },
            {
              input: {
                question:
                  'From logs-apm.custom-*, what is the total count of logs for each individual tag?',
              },
              output: {
                expected: `FROM logs-apm.custom-*
                | WHERE @timestamp >= NOW() - 24 hours
                | MV_EXPAND tags
                | STATS count = COUNT(*) BY tags
                | SORT count DESC`,
                execute: true,
                criteria: [
                  'The result should be a list of tags and their corresponding total counts across all logs.',
                ],
              },
              metadata: {},
            },
            {
              input: {
                question: `From logs-apm.custom-*, list info-level logs that are tagged with 'cache' but NOT with 'search'.`,
              },
              output: {
                expected: `FROM logs-apm.custom-*
                | WHERE @timestamp >= NOW() - 24 hours AND log.level == "info" AND tags == "cache" AND NOT tags == "search"
                | KEEP message, tags`,
                execute: true,
                criteria: [
                  "Results must contain the 'cache' tag.",
                  "Results must NOT contain the 'search' tag.",
                ],
              },
              metadata: {},
            },
            {
              input: {
                question: `Show me a side-by-side hourly comparison of the transaction failure count from 'my-apm-service' and the error log count from 'my-apm-service-2' over the last 24 hours.`,
              },
              output: {
                expected: `FROM "*apm*"
                | WHERE @timestamp >= NOW() - 24 hours
                | EVAL tx_failure = CASE(processor.event == "transaction" AND event.outcome == "failure" AND service.name == "my-apm-service", 1, 0),
                      log_error = CASE(log.level == "error" AND service.name == "my-apm-service-2", 1, 0)
                | STATS failure_count = SUM(tx_failure), error_log_count = SUM(log_error) BY BUCKET(@timestamp, 1h)
                | WHERE failure_count > 0 OR error_log_count > 0
                | SORT \`BUCKET(@timestamp, 1h)\` ASC`,
                execute: true,
                criteria: [
                  'The result is a table showing a side-by-side comparison of `failure_count` and `error_log_count` for each hour.',
                  'The result set should contain approximately 24 or 25 rows, representing the hourly buckets over the last 24 hours.',
                  'The `failure_count` must sum transaction failures from `my-apm-service`, and `error_log_count` must sum error logs from `my-apm-service-2`.',
                  'The results must be sorted chronologically from oldest to newest.',
                ],
              },
              metadata: {},
            },
            {
              input: {
                question: `From the custom APM error logs, parse the duration from the message field and calculate the average parsed duration for each tag.`,
              },
              output: {
                expected: `FROM logs-apm.custom-*
                | WHERE @timestamp >= NOW() - 24 hours AND log.level == 'error'
                | GROK message "%{GREEDYDATA}duration: %{NUMBER:duration_ms:string}ms"
                | WHERE duration_ms IS NOT NULL
                | EVAL duration = TO_LONG(duration_ms)
                | MV_EXPAND tags
                | STATS avg_parsed_duration = AVG(duration) BY tags
                | SORT avg_parsed_duration DESC`,
                execute: true,
                criteria: [
                  'The result should contain a row for each of the 5 possible tags.',
                  "The 'avg_parsed_duration' for each tag should be a value between 5 and 200.",
                  "The results must be sorted in descending order by 'avg_parsed_duration'.",
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });
  });

  // --- Test Suite for Packetbeat Data ---
  evaluate.describe('with Packetbeat data', () => {
    const indexName = 'packetbeat-test-data';
    evaluate.beforeAll(async ({ esClient }) => {
      await generatePacketbeatData({ esClient, indexName });
    });

    evaluate.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: indexName, allow_no_indices: true });
    });

    evaluate('Packetbeat data queries', async ({ evaluateEsqlDataset }) => {
      await evaluateEsqlDataset({
        dataset: {
          name: 'esql: with packetbeat data',
          description: 'Packetbeat question/query pairs.',
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
            {
              input: {
                question: 'Show me the count of each HTTP response status code.',
              },
              output: {
                expected: `FROM packetbeat-*
                | WHERE http.response.status_code IS NOT NULL
                | STATS request_count = COUNT(*) BY http.response.status_code
                | SORT request_count DESC`,
                execute: true,
                criteria: ['The result should show counts for status codes 200, 404, and 503.'],
              },
              metadata: {},
            },
            {
              input: {
                question: 'List all failed DNS queries from the last hour.',
              },
              output: {
                expected: `FROM packetbeat-*
                | WHERE @timestamp >= NOW() - 1 hour AND dns.response_code IS NOT NULL AND dns.response_code != "NOERROR"`,
                execute: true,
                criteria: [
                  'The result should find the query for "nonexistent.domain.xyz" with the response code "NXDomain".',
                ],
              },
              metadata: {},
            },
            {
              input: {
                question: 'What are the top 5 network conversations by total bytes transferred?',
              },
              output: {
                expected: `FROM packetbeat-*
                | WHERE client.ip IS NOT NULL AND server.ip IS NOT NULL
                | EVAL total_bytes = destination.bytes + source.bytes
                | STATS total_transfer = SUM(total_bytes) BY client.ip, server.ip
                | SORT total_transfer DESC
                | LIMIT 5`,
                execute: true,
                criteria: [
                  'The result should show IP pairs and their total data transfer, sorted descending.',
                ],
              },
              metadata: {},
            },
          ],
        },
      });
    });
  });

  // --- Test Suite for Employee Data ---
  evaluate.describe('with Employees data', () => {
    evaluate.beforeAll(async ({ esClient }) => {
      await esClient.indices.create({
        index: 'employees',
        mappings: {
          properties: {
            hire_date: { type: 'date' },
            emp_no: { type: 'integer' },
            salary: { type: 'integer' },
          },
        },
      });
      await esClient.index({
        index: 'employees',
        document: { hire_date: '2024-01-23T12:30:00.000Z', emp_no: 1, salary: 100 },
      });
    });

    evaluate.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: 'employees' });
    });

    evaluate('Employees data queries', async ({ evaluateEsqlDataset }) => {
      await evaluateEsqlDataset({
        dataset: {
          name: 'esql: with employees data',
          description: 'ES|QL questions against a simple `employees` index.',
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
  });

  // --- Test Suite for Queries without Data ---
  evaluate('without data', async ({ evaluateEsqlDataset }) => {
    await evaluateEsqlDataset({
      dataset: {
        name: 'esql: without data',
        description: 'ES|QL query generation without any data or mappings.',
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
              question: `Assume my data is in \`metricbeat*\`. Show me an example query to see the percentage of CPU time (system.cpu.system.pct) normalized by the number of CPU cores (system.cpu.cores), broken down by host name`,
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
                'Show me an example ES|QL query to extract the query duration from postgres log messages in postgres-logs*, with this format:\n `2021-01-01 00:00:00 UTC [12345]: [1-1] user=postgres,db=mydb,app=[unknown],client=127.0.0.1 LOG:  duration: 123.456 ms  statement: SELECT * FROM my_table`. \n Use ECS fields, and calculate the avg.',
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
          {
            input: {
              question:
                "Assume user login data is logs-auth_service-*. The event action for user login is `login`. Generate an example query to fetch successful logins today and for each successful login, show the user's full name and department. The user meta data is in the users_metadata index.",
            },
            output: {
              expected: `FROM logs-auth_service-*
              | WHERE @timestamp >= NOW() - 1 day AND event.action == "login"
              | LOOKUP JOIN users_metadata ON user.id
              | KEEP @timestamp, user.id, full_name, department
              | LIMIT 20`,
              execute: false,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  // --- Test Suite for SPL to ES|QL Conversion ---
  evaluate('SPL to ES|QL conversion', async ({ evaluateEsqlDataset }) => {
    await evaluateEsqlDataset({
      dataset: {
        name: 'esql: from SPL',
        description: 'Conversion of SPL (Splunk Processing Language) queries to ES|QL.',
        examples: [
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=network_firewall "SYN Timeout" | stats count by dest`,
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
              question: `Can you convert this SPL query to ES|QL? index=prod_web | eval length=len(message) | eval k255=if((length>255),1,0) | eval k2=if((length>2048),1,0) | eval k4=if((length>4096),1,0) |eval k16=if((length>16384),1,0) | stats count, sum(k255), sum(k2),sum(k4),sum(k16), sum(length)`,
            },
            output: {
              expected: `from prod_web
              | EVAL length = length(message), k255 = CASE(length > 255, 1, 0), k2 = CASE(length > 2048, 1, 0), k4 = CASE(length > 4096, 1, 0), k16 = CASE(length > 16384, 1, 0)
              | STATS COUNT(*), SUM(k255), SUM(k2), SUM(k4), SUM(k16), SUM(length)`,
              criteria: [
                'The query provided by the Assistant uses the ES|QL functions LENGTH and CASE, not the SPL functions len and if',
              ],
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=prod_web NOT "Connection reset" NOT "[acm-app] created a ThreadLocal" sourcetype!=prod_urlf_east_logs sourcetype!=prod_urlf_west_logs host!="dbs-tools-*" NOT "Public] in context with path [/global] " host!="*dev*" host!="*qa*" host!="*uat*"`,
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
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=security sourcetype=linux_secure "Failed password"`,
            },
            output: {
              expected: `FROM security
              | WHERE _raw == "Failed password" AND sourcetype == "linux_secure"`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=firewall (action=allow AND dest_port=443) OR (action=block AND protocol=tcp)`,
            },
            output: {
              expected: `FROM firewall
              | WHERE (action == "allow" AND dest_port == 443) OR (action == "block" AND protocol == "tcp")`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=prod_web host="webapp-*"`,
            },
            output: {
              expected: `FROM prod_web
              | WHERE host LIKE "webapp-%"`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=sales status>=400 status<500`,
            },
            output: {
              expected: `FROM sales
              | WHERE status >= 400 AND status < 500`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=inventory | eval price_with_tax = price * 1.13 | eval category = if(price > 1000, "premium", "standard")`,
            },
            output: {
              expected: `FROM inventory
              | EVAL price_with_tax = price * 1.13, category = CASE(price > 1000, "premium", "standard")`,
              criteria: ['The query should use the ES|QL function CASE, not the SPL function if'],
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=network_logs | rename source_ip as client_ip, dest_ip as server_ip`,
            },
            output: {
              expected: `FROM network_logs
              | RENAME source_ip AS client_ip, dest_ip AS server_ip`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=employees | fields name, department, title`,
            },
            output: {
              expected: `FROM employees
              | KEEP name, department, title`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=employees | fields - _raw, _time`,
            },
            output: {
              expected: `FROM employees
              | DROP _raw, _time`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=web_traffic | stats count, dc(client_ip) as unique_visitors, avg(response_time) as avg_latency by http_method`,
            },
            output: {
              expected: `FROM web_traffic
              | STATS count = count(*), unique_visitors = count_distinct(client_ip), avg_latency = avg(response_time) by http_method`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=products | stats sum(sales) as total_sales by category | sort - total_sales`,
            },
            output: {
              expected: `FROM products
              | STATS total_sales = sum(sales) by category
              | SORT total_sales DESC`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=access_logs | top limit=10 user`,
            },
            output: {
              expected: `FROM access_logs
              | STATS count = count(*) by user
              | SORT count DESC
              | LIMIT 10`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=error_logs | rare limit=5 error_code`,
            },
            output: {
              expected: `FROM error_logs
              | STATS count = count(*) by error_code
              | SORT count ASC
              | LIMIT 5`,
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=auth | timechart span=1h count by action`,
            },
            output: {
              expected: [
                `FROM auth
                | STATS count = count(*) by BUCKET(@timestamp, 1h), action`,
                `FROM auth
                | HISTOGRAM count(*) BY action, @timestamp BUCKETS=1h`,
              ],
              criteria: [
                'The query should use STATS with BUCKET to group data over time, which is an ES|QL equivalent of timechart.',
              ],
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=main [search index=suspicious_users | fields user_id]`,
            },
            output: {
              expected: [
                `FROM main
                | WHERE user_id IN (FROM suspicious_users | KEEP user_id)`,
                `FROM main
                | LOOKUP JOIN suspicious_users ON user_id`,
              ],
              execute: false,
            },
            metadata: {},
          },
          {
            input: {
              question: `Can you convert this SPL query to ES|QL? index=firewall | table _time, src_ip, dest_ip, action`,
            },
            output: {
              expected: `FROM firewall
              | KEEP @timestamp, src_ip, dest_ip, action`,
              execute: false,
            },
            metadata: {},
          },
        ],
      },
    });
  });
});
