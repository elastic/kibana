/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { apm, timerange, log, serviceMap } from '@kbn/synthtrace-client';
import type { SynthtraceFixture } from '@kbn/scout-oblt';
import { faker } from '@faker-js/faker';

const APM_SERVICE_NAME = 'my-apm-service';
const APM_INSTANCE_NAME = 'my-apm-instance';

export async function generateApmData({
  apmSynthtraceEsClient,
}: {
  apmSynthtraceEsClient: SynthtraceFixture['apmSynthtraceEsClient'];
}) {
  const myServiceInstance = apm
    .service(APM_SERVICE_NAME, 'production', 'go')
    .instance(APM_INSTANCE_NAME);

  await apmSynthtraceEsClient.index(
    timerange(moment().subtract(24, 'hours'), moment())
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
    timerange(moment().subtract(24, 'hours'), moment())
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
}

export async function generateCustomApmLogs({
  logsSynthtraceEsClient,
}: {
  logsSynthtraceEsClient: SynthtraceFixture['logsSynthtraceEsClient'];
}) {
  const tagOptions = ['db', 'auth', 'cache', 'queue', 'search'];
  await logsSynthtraceEsClient.index(
    timerange(moment().subtract(24, 'hours'), moment())
      .interval('30s')
      .rate(5)
      .generator((timestamp) => {
        const isError = Math.random() < 0.15;
        const level = isError ? 'error' : 'info';
        const duration = faker.number.int({ min: 5, max: 200 });

        return log
          .create()
          .service('my-apm-service-2')
          .dataset('apm.custom')
          .timestamp(timestamp.valueOf())
          .logLevel(level)
          .message(
            `${moment(timestamp).format(
              'YYYY-MM-DDTHH:mm:ss'
            )} - ${level.toUpperCase()} - duration: ${duration}ms`
          )
          .overrides({
            tags: faker.helpers.arrayElements(tagOptions, faker.number.int({ min: 1, max: 3 })),
          });
      })
  );
}

export async function generateAIAssistantApmScenario({
  apmSynthtraceEsClient,
}: {
  apmSynthtraceEsClient: SynthtraceFixture['apmSynthtraceEsClient'];
}) {
  const serviceMapCallback = serviceMap({
    services: [{ 'ai-assistant-service-front': 'go' }, { 'ai-assistant-service-back': 'python' }],
    environment: 'test',
    definePaths([main, reco]) {
      return [
        [
          [main, 'fetchReco'],
          [reco, 'GET /api'],
        ],
        [reco],
      ];
    },
  });

  const aiAssistantService = apm
    .service('ai-assistant-service', 'test', 'go')
    .instance('my-instance');

  const aiAssistantServicePython = apm
    .service('ai-assistant-service-reco', 'test', 'python')
    .instance('my-instance');

  await apmSynthtraceEsClient.index(
    timerange(moment().subtract(15, 'minutes'), moment())
      .interval('1m')
      .rate(10)
      .generator((timestamp) => {
        return [
          ...serviceMapCallback(timestamp),
          aiAssistantService
            .transaction('getReco')
            .timestamp(timestamp)
            .duration(50)
            .outcome('success'),
          aiAssistantService
            .transaction('removeReco')
            .timestamp(timestamp)
            .duration(50)
            .failure()
            .errors(
              aiAssistantService
                .error({ message: 'ERROR removeReco not suported', type: 'My Type' })
                .timestamp(timestamp)
            ),
          aiAssistantService
            .transaction('GET /api_v1')
            .timestamp(timestamp)
            .duration(50)
            .outcome('success'),
          aiAssistantServicePython
            .transaction('GET /api_v2')
            .timestamp(timestamp)
            .duration(50)
            .failure()
            .errors(
              aiAssistantServicePython
                .error({ message: 'ERROR api_v2 not supported', type: 'My Type' })
                .timestamp(timestamp)
            ),
        ];
      })
  );
}
