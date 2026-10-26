/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { apm, timerange } from '@kbn/synthtrace-client';
import { SERVICE_MOBILE_MOST_USED, PRODUCTION_ENVIRONMENT } from '../constants';

const SERVICE_VERSIONS = ['2.3', '1.2', '1.1'];

// Mobile app data carrying device, OS and network-connection dimensions so the
// "most used" charts on the mobile service overview have something to render.
export function generateMobileMostUsedData({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const galaxy10 = apm
    .mobileApp({
      name: SERVICE_MOBILE_MOST_USED,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'android/java',
    })
    .mobileDevice({ serviceVersion: SERVICE_VERSIONS[0] })
    .deviceInfo({
      manufacturer: 'Samsung',
      modelIdentifier: 'SM-G973F',
      modelName: 'Galaxy S10',
    })
    .osInfo({
      osType: 'android',
      osVersion: '10',
      osFull: 'Android 10, API level 29, BUILD A022MUBU2AUD1',
      runtimeVersion: '2.1.0',
    })
    .setNetworkConnection({ type: 'wifi' });

  const galaxy7 = apm
    .mobileApp({
      name: SERVICE_MOBILE_MOST_USED,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'android/java',
    })
    .mobileDevice({ serviceVersion: SERVICE_VERSIONS[1] })
    .deviceInfo({
      manufacturer: 'Samsung',
      modelIdentifier: 'SM-G930F',
      modelName: 'Galaxy S7',
    })
    .osInfo({
      osType: 'android',
      osVersion: '10',
      osFull: 'Android 10, API level 29, BUILD A022MUBU2AUD1',
      runtimeVersion: '2.1.0',
    })
    .setNetworkConnection({
      type: 'cell',
      subType: 'edge',
      carrierName: 'M1 Limited',
      carrierMNC: '03',
      carrierICC: 'SG',
      carrierMCC: '525',
    });

  const huaweiP2 = apm
    .mobileApp({
      name: SERVICE_MOBILE_MOST_USED,
      environment: PRODUCTION_ENVIRONMENT,
      agentName: 'android/java',
    })
    .mobileDevice({ serviceVersion: SERVICE_VERSIONS[2] })
    .deviceInfo({
      manufacturer: 'Huawei',
      modelIdentifier: 'HUAWEI P2-0000',
      modelName: 'HuaweiP2',
    })
    .osInfo({
      osType: 'android',
      osVersion: '9',
      osFull: 'Android 9, API level 28, BUILD A022MUBU2AUD1',
      runtimeVersion: '2.1.0',
    })
    .setNetworkConnection({
      type: 'cell',
      subType: 'edge',
      carrierName: 'Osaka Gas Business Create Co., Ltd.',
      carrierMNC: '17',
      carrierICC: 'JP',
      carrierMCC: '440',
    });

  return timerange(from, to)
    .interval('5m')
    .rate(1)
    .generator((timestamp) => {
      galaxy10.startNewSession();
      galaxy7.startNewSession();
      huaweiP2.startNewSession();
      return [
        galaxy10
          .transaction('Start View - View Appearing', 'Android Activity')
          .timestamp(timestamp)
          .duration(500)
          .success(),
        galaxy7
          .transaction('Start View - View Appearing', 'Android Activity')
          .timestamp(timestamp)
          .duration(20)
          .success(),
        huaweiP2
          .transaction('Start View - View Appearing', 'huaweiP2 Activity')
          .timestamp(timestamp)
          .duration(20)
          .success(),
      ];
    });
}
