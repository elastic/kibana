/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dedent from 'dedent';
import { noop } from 'lodash';
import { correctCommonEsqlMistakes } from './correct_common_esql_mistakes';

describe('correctCommonEsqlMistakes', () => {
  const fakeLogger = {
    debug: noop,
  } as any;

  function renderQuery(query: string) {
    return '```esql\n' + dedent(query) + '\n```';
  }

  function expectQuery(input: string, expectedOutput: string) {
    expect(correctCommonEsqlMistakes(renderQuery(input), fakeLogger)).toEqual(
      renderQuery(expectedOutput)
    );
  }

  it('replaces aliasing via the AS keyword with the = operator', () => {
    expectQuery(`FROM logs-* | STATS COUNT() AS count`, 'FROM logs-*\n| STATS count = COUNT()');
    expectQuery(
      `FROM logs-* | STATS AVG(transaction.duration.histogram) AS avg_request_latency, PERCENTILE(transaction.duration.histogram, 95) AS p95`,
      `FROM logs-*
      | STATS avg_request_latency = AVG(transaction.duration.histogram), p95 = PERCENTILE(transaction.duration.histogram, 95)`
    );

    expectQuery(
      `FROM traces-apm*
      | WHERE @timestamp >= NOW() - 24 hours
      | STATS AVG(transaction.duration.us) AS avg_duration, SUM(success) AS total_successes, COUNT(*) AS total_requests BY service.name`,
      `FROM traces-apm*
      | WHERE @timestamp >= NOW() - 24 hours
      | STATS avg_duration = AVG(transaction.duration.us), total_successes = SUM(success), total_requests = COUNT(*) BY service.name`
    );
  });

  it(`replaces " or ' escaping in FROM statements with backticks`, () => {
    expectQuery(`FROM "logs-*" | LIMIT 10`, 'FROM `logs-*`\n| LIMIT 10');
    expectQuery(`FROM 'logs-*' | LIMIT 10`, 'FROM `logs-*`\n| LIMIT 10');
    expectQuery(`FROM logs-* | LIMIT 10`, 'FROM logs-*\n| LIMIT 10');
  });

  it('replaces single-quote escaped strings with double-quote escaped strings', () => {
    expectQuery(
      `FROM nyc_taxis
    | WHERE DATE_EXTRACT('hour', dropoff_datetime) >= 6 AND DATE_EXTRACT('hour', dropoff_datetime) < 10
    | LIMIT 10`,
      `FROM nyc_taxis
    | WHERE DATE_EXTRACT("hour", dropoff_datetime) >= 6 AND DATE_EXTRACT("hour", dropoff_datetime) < 10
    | LIMIT 10`
    );
    expectQuery(
      `FROM nyc_taxis
    | WHERE DATE_EXTRACT('hour', "hh:mm a, 'of' d MMMM yyyy") >= 6 AND DATE_EXTRACT('hour', dropoff_datetime) < 10
    | LIMIT 10`,
      `FROM nyc_taxis
    | WHERE DATE_EXTRACT("hour", "hh:mm a, 'of' d MMMM yyyy") >= 6 AND DATE_EXTRACT("hour", dropoff_datetime) < 10
    | LIMIT 10`
    );
  });

  it(`verifies if the SORT key is in KEEP, and if it's not, it will include it`, () => {
    expectQuery(
      'FROM logs-* \n| KEEP date \n| SORT @timestamp DESC',
      'FROM logs-*\n| KEEP date, @timestamp\n| SORT @timestamp DESC'
    );

    expectQuery(
      `FROM logs-* | KEEP date, whatever | EVAL my_truncated_date_field = DATE_TRUNC(1 year, date) | SORT @timestamp, my_truncated_date_field DESC`,
      'FROM logs-*\n| KEEP date, whatever, @timestamp\n| EVAL my_truncated_date_field = DATE_TRUNC(1 year, date)\n| SORT @timestamp, my_truncated_date_field DESC'
    );

    expectQuery(
      `FROM logs-* | KEEP date, whatever | RENAME whatever AS forever | SORT forever DESC`,
      `FROM logs-*\n| KEEP date, whatever\n| RENAME whatever AS forever\n| SORT forever DESC`
    );
  });

  it(`escapes the column name if SORT uses an expression`, () => {
    expectQuery(
      'FROM logs-* \n| STATS COUNT(*) by service.name\n| SORT COUNT(*) DESC',
      'FROM logs-*\n| STATS COUNT(*) BY service.name\n| SORT `COUNT(*)` DESC'
    );

    expectQuery(
      'FROM logs-* \n| STATS COUNT(*) by service.name\n| SORT COUNT(*) DESC, @timestamp ASC',
      'FROM logs-*\n| STATS COUNT(*) BY service.name\n| SORT `COUNT(*)` DESC, @timestamp ASC'
    );
  });

  it(`handles complicated queries correctly`, () => {
    expectQuery(
      `FROM "postgres-logs*"
      | GROK message "%{TIMESTAMP_ISO8601:timestamp} %{TZ} \[%{NUMBER:process_id}\]: \[%{NUMBER:log_line}\] user=%{USER:user},db=%{USER:database},app=\[%{DATA:application}\],client=%{IP:client_ip} LOG:  duration: %{NUMBER:duration:float} ms  statement: %{GREEDYDATA:statement}"
      | EVAL "@timestamp" = TO_DATETIME(timestamp)
      | WHERE statement LIKE 'SELECT%'
      | STATS avg_duration = AVG(duration)`,
      `FROM \`postgres-logs*\`
    | GROK message "%{TIMESTAMP_ISO8601:timestamp} %{TZ} \[%{NUMBER:process_id}\]: \[%{NUMBER:log_line}\] user=%{USER:user},db=%{USER:database},app=\[%{DATA:application}\],client=%{IP:client_ip} LOG:  duration: %{NUMBER:duration:float} ms  statement: %{GREEDYDATA:statement}"
    | EVAL @timestamp = TO_DATETIME(timestamp)
    | WHERE statement LIKE "SELECT%"
    | STATS avg_duration = AVG(duration)`
    );

    expectQuery(
      `FROM metrics-apm*
      | WHERE metricset.name == "service_destination" AND @timestamp > NOW() - 24 hours
      | EVAL total_events = span.destination.service.response_time.count
      | EVAL total_latency = span.destination.service.response_time.sum.us
      | EVAL is_failure = CASE(event.outcome == "failure", 1, 0)
      | STATS 
          avg_throughput = AVG(total_events), 
          avg_latency_per_request = AVG(total_latency / total_events), 
          failure_rate = AVG(is_failure) 
        BY span.destination.service.resource`,
      `FROM metrics-apm*
      | WHERE metricset.name == "service_destination" AND @timestamp > NOW() - 24 hours
      | EVAL total_events = span.destination.service.response_time.count
      | EVAL total_latency = span.destination.service.response_time.sum.us
      | EVAL is_failure = CASE(event.outcome == "failure", 1, 0)
      | STATS avg_throughput = AVG(total_events), avg_latency_per_request = AVG(total_latency / total_events), failure_rate = AVG(is_failure) BY span.destination.service.resource`
    );
  });
});
