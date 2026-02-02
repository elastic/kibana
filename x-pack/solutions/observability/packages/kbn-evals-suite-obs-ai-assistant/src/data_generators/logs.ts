/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type { LogDocument } from '@kbn/synthtrace-client';
import { timerange, log } from '@kbn/synthtrace-client';
import type { SynthtraceFixture } from '@kbn/scout-oblt';
import { randomInt } from 'crypto';

export async function generateFrequentErrorLogs({
  logsSynthtraceEsClient,
  dataset,
  errorMessages,
}: {
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient'];
  dataset: string;
  errorMessages: Record<string, number>;
}) {
  const timeRange = timerange(moment().subtract(1, 'day'), moment());
  const timeRangeInSeconds = 24 * 60 * 60;

  for (const [msg, count] of Object.entries(errorMessages)) {
    const intervalInSeconds = Math.max(1, Math.floor(timeRangeInSeconds / count));
    const logStream = timeRange.interval(`${intervalInSeconds}s`).generator((timestamp) =>
      log
        .create()
        .message(msg)
        .dataset(dataset)
        .timestamp(timestamp)
        .logLevel(msg.startsWith('ERROR') ? 'error' : 'warn')
        .overrides({
          tags: ['test-data', 'frequent-errors'],
        })
    );

    await logsSynthtraceEsClient.index(logStream);
  }
}

export async function generateNginxLatencyLogs({
  logsSynthtraceEsClient,
  dataset,
  count,
  services,
}: {
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient'];
  dataset: string;
  count: number;
  services: string[];
}) {
  const timeRange = timerange(moment().subtract(2, 'hours'), moment());
  const timeRangeInSeconds = 2 * 60 * 60;
  const intervalInSeconds = Math.max(1, Math.floor(timeRangeInSeconds / count));

  const logStream = timeRange.interval(`${intervalInSeconds}s`).generator((timestamp) => {
    const requestTime = Math.random() > 0.95 ? Math.random() * 0.4 + 0.1 : Math.random() * 0.1;
    const serviceName = services[Math.floor(Math.random() * services.length)];
    const nginxMessage = `172.18.0.1 - - [${moment(timestamp).format(
      'DD/MMM/YYYY:HH:mm:ss ZZ'
    )}] "GET /health HTTP/1.1" 200 2 "-" "Kibana/8.12.0" ${requestTime.toFixed(3)}`;

    return log
      .create()
      .message(nginxMessage)
      .service(serviceName)
      .dataset(dataset)
      .timestamp(timestamp)
      .overrides({ tags: ['test-data', 'nginx-latency'] });
  });

  await logsSynthtraceEsClient.index(logStream);
}

export async function generateServiceErrorRateLogs({
  logsSynthtraceEsClient,
  dataset,
  serviceName,
  hours = 6,
  intervalMinutes = 5,
  errorRatio = 0.5,
}: {
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient'];
  dataset: string;
  serviceName: string;
  hours?: number;
  intervalMinutes?: number;
  errorRatio?: number;
}) {
  const range = timerange(moment().subtract(hours, 'hours'), moment());

  const logStream = range.interval(`${intervalMinutes}m`).generator((timestamp) => {
    const isError = Math.random() < errorRatio;
    return log
      .create()
      .timestamp(timestamp)
      .dataset(dataset)
      .service(serviceName)
      .logLevel(isError ? 'error' : 'info')
      .message(isError ? 'Simulated error' : 'Request OK');
  });

  await logsSynthtraceEsClient.index(logStream);
}

export async function generatePodRestartLogs({
  logsSynthtraceEsClient,
  podName = 'web-123',
  restartCount = 2,
  minutesAgo = 60,
}: {
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient'];
  podName?: string;
  restartCount?: number;
  minutesAgo?: number;
}) {
  const range = timerange(
    moment().subtract(minutesAgo, 'minutes'),
    moment().subtract(minutesAgo - 1, 'minutes')
  );

  const logStream = range.interval('1m').generator((ts) =>
    log
      .create()
      .timestamp(ts.valueOf())
      .dataset('kube.logs')
      .logLevel('info')
      .message('Pod restarted')
      .overrides({
        'kubernetes.pod.name': podName,
        'kubernetes.pod.restart_count': restartCount,
      } as any)
  );

  await logsSynthtraceEsClient.index(logStream);
}

export async function generateCorrelationIdLog({
  logsSynthtraceEsClient,
  dataset = 'my_test_app',
  serviceName = 'my-service',
  correlationId = 'abc123',
  minutesAgo = 10,
}: {
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient'];
  dataset?: string;
  serviceName?: string;
  correlationId?: string;
  minutesAgo?: number;
}) {
  const range = timerange(
    moment().subtract(minutesAgo, 'minutes'),
    moment().subtract(minutesAgo - 1, 'minutes')
  );

  const logStream = range.interval('1m').generator((ts) =>
    log
      .create()
      .timestamp(ts.valueOf())
      .dataset(dataset)
      .service(serviceName)
      .logLevel('error')
      .message('Simulated error with correlation id')
      .overrides({ 'trace.id': correlationId } as any)
  );

  await logsSynthtraceEsClient.index(logStream);
}

export async function generateApacheErrorSpikeLogs({
  logsSynthtraceEsClient,
  dataset,
  errorMessage,
}: {
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient'];
  dataset: string;
  errorMessage: string;
}) {
  // 1. Generate a baseline: one error every 15 minutes for 6 hours.
  const baselineRange = timerange(moment().subtract(6, 'hours'), moment());
  const baselineLogs = baselineRange
    .interval('15m') // Create one log every 15 minutes.
    .generator((timestamp) =>
      log
        .create()
        .message(errorMessage)
        .dataset(dataset)
        .timestamp(timestamp)
        .logLevel('error')
        .overrides({
          tags: ['test-data', 'error-spike', 'baseline'],
        })
    );

  // 2. Generate a spike: one error every 3 seconds for a 10-minute window.
  const spikeTime = moment().subtract(3, 'hours');
  const spikeRange = timerange(spikeTime, spikeTime.clone().add(10, 'minutes'));
  const spikeLogs = spikeRange
    .interval('3s') // Create one log every 3 seconds for a high-frequency burst.
    .generator((timestamp) =>
      log
        .create()
        .message(errorMessage)
        .dataset(dataset)
        .timestamp(timestamp)
        .logLevel('error')
        .overrides({
          tags: ['test-data', 'error-spike', 'spike'],
        })
    );

  await logsSynthtraceEsClient.index(baselineLogs);
  await logsSynthtraceEsClient.index(spikeLogs);
}

export async function generateUniqueUserLoginLogs({
  logsSynthtraceEsClient,
  dataset,
  userPool,
  days,
}: {
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient'];
  dataset: string;
  userPool: string[];
  days: number;
}) {
  const timeRangeInSeconds = 24 * 60 * 60;

  for (let day = 0; day < days; day++) {
    const startOfDay = moment().subtract(day, 'days').startOf('day');
    const endOfDay = moment().subtract(day, 'days').endOf('day');
    const timeRange = timerange(startOfDay, endOfDay);

    // Simulate a random number of total logins for the day.
    const dailyLogins = 25;
    const intervalInSeconds = Math.max(1, Math.floor(timeRangeInSeconds / dailyLogins));

    const logStream = timeRange.interval(`${intervalInSeconds}s`).generator((timestamp) => {
      if (userPool.length === 0) {
        throw new Error('userPool must not be empty');
      }

      const userId = userPool[randomInt(userPool.length)];

      const overrides = {
        'event.action': 'login',
        'user.id': userId,
        tags: ['test-data', 'user-logins'],
      } as Record<string, unknown>;

      return log
        .create()
        .message(`User '${userId}' logged in successfully.`)
        .dataset(dataset)
        .timestamp(timestamp)
        .logLevel('info')
        .overrides(overrides as unknown as Partial<LogDocument>);
    });

    await logsSynthtraceEsClient.index(logStream);
  }
}

export async function generateHttpStatusLogs({
  logsSynthtraceEsClient,
  dataset,
  count,
}: {
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient'];
  dataset: string;
  count: number;
}) {
  const timeRange = timerange(moment().subtract(1, 'day'), moment());
  const successCodes = [200, 201, 301, 302];
  const errorCodes = [400, 401, 403, 404, 500, 502, 503];

  // Calculate an interval to spread the logs over the time range
  const timeRangeInSeconds = 24 * 60 * 60;
  const intervalInSeconds = Math.max(1, Math.floor(timeRangeInSeconds / count));

  const logStream = timeRange.interval(`${intervalInSeconds}s`).generator((timestamp) => {
    // Generate ~85% success codes and ~15% error codes
    const isSuccess = Math.random() > 0.15;
    const statusCode = isSuccess
      ? successCodes[Math.floor(Math.random() * successCodes.length)]
      : errorCodes[Math.floor(Math.random() * errorCodes.length)];

    return log
      .create()
      .timestamp(timestamp)
      .dataset(dataset)
      .message(`Request finished with status ${statusCode}`)
      .overrides({
        'http.response.status_code': statusCode,
      } as any);
  });

  await logsSynthtraceEsClient.index(logStream);
}
