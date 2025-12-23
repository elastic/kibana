/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';

export const MOBILE_ANDROID_SERVICE_NAME = 'synth-android';
export const MOBILE_IOS_SERVICE_NAME = 'synth-ios';
export const SYNTH_GO_SERVICE_NAME = 'synth-go-1';

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
      name: SYNTH_GO_SERVICE_NAME,
      environment: 'production',
      agentName: 'go',
    })
    .instance('synth-go-instance');

  const synthIOS = apm
    .service({
      name: MOBILE_IOS_SERVICE_NAME,
      environment: 'production',
      agentName: 'iOS/swift',
    })
    .instance('synth-ios-instance');

  const synthAndroid = apm
    .service({
      name: MOBILE_ANDROID_SERVICE_NAME,
      environment: 'production',
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
