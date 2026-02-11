/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import {
  SERVICE_MOBILE_ANDROID,
  SERVICE_MOBILE_IOS,
  SERVICE_SYNTH_GO,
  PRODUCTION_ENVIRONMENT,
} from '../constants';

export function mobileServices({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const range = timerange(from, to);

  const synthGo = apm
    .service({
      name: SERVICE_SYNTH_GO,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'go',
    })
    .instance('synth-go-instance');

  const synthIOS = apm
    .service({
      name: SERVICE_MOBILE_IOS,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'iOS/swift',
    })
    .instance('synth-ios-instance');

  const synthAndroid = apm
    .service({
      name: SERVICE_MOBILE_ANDROID,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'android/java',
    })
    .instance('synth-android-instance');

  return range
    .interval('1m')
    .rate(1)
    .generator((timestamp) => [
      synthGo
        .transaction({ transactionName: 'GET /apple' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      synthIOS
        .transaction({ transactionName: 'GET /banana' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
      synthAndroid
        .transaction({ transactionName: 'GET /apple' })
        .timestamp(timestamp)
        .duration(1000)
        .success(),
    ]);
}
