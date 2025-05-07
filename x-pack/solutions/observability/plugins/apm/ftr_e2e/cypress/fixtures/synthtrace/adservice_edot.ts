/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apmOtel, timerange } from '@kbn/apm-synthtrace-client';

export function adserviceEdot({ from, to }: { from: number; to: number }) {
  const range = timerange(from, to);
  const transactionName = 'oteldemo.AdServiceEdotSynth/GetAds';

  const edotInstance = apmOtel
    .service({
      name: 'adservice-edot-synth',
      namespace: 'opentelemetry-demo',
      sdkLanguage: 'java',
      sdkName: 'opentelemetry',
      distro: 'elastic',
    })
    .instance('da7a8507-53be-421c-8d77-984f12397213');

  return range
    .interval('1s')
    .rate(1)
    .generator((timestamp) => [
      edotInstance
        .transaction({
          transactionName,
        })
        .overrides({
          'attributes.server.address': 'otel-demo-blue-adservice-edot-synth',
          'attributes.server.port': 8080,
          'attributes.url.path': '/some/path',
          'attributes.url.scheme': 'https',
          'attributes.url.full': undefined,
        })
        .timestamp(timestamp)
        .duration(551)
        .success(),
    ]);
}
