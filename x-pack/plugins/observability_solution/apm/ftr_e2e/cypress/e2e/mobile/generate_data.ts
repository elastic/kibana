/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apm, timerange } from '@kbn/apm-synthtrace-client';

export const SERVICE_VERSIONS = ['2.3', '1.2', '1.1'];

export function generateMobileData({ from, to }: { from: number; to: number }) {
  const galaxy10 = apm
    .mobileApp({
      name: 'synth-android',
      environment: 'production',
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
    .setGeoInfo({
      clientIp: '223.72.43.22',
      cityName: 'Beijing',
      continentName: 'Asia',
      countryIsoCode: 'CN',
      countryName: 'China',
      regionIsoCode: 'CN-BJ',
      regionName: 'Beijing',
      location: { coordinates: [116.3861, 39.9143], type: 'Point' },
    })
    .setNetworkConnection({ type: 'wifi' });

  const galaxy7 = apm
    .mobileApp({
      name: 'synth-android',
      environment: 'production',
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
    .setGeoInfo({
      clientIp: '223.72.43.22',
      cityName: 'Beijing',
      continentName: 'Asia',
      countryIsoCode: 'CN',
      countryName: 'China',
      regionIsoCode: 'CN-BJ',
      regionName: 'Beijing',
      location: { coordinates: [116.3861, 39.9143], type: 'Point' },
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
      name: 'synth-android',
      environment: 'production',
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
      osVersion: '10',
      osFull: 'Android 10, API level 29, BUILD A022MUBU2AUD1',
      runtimeVersion: '2.1.0',
    })
    .setGeoInfo({
      clientIp: '20.24.184.101',
      cityName: 'Singapore',
      continentName: 'Asia',
      countryIsoCode: 'SG',
      countryName: 'Singapore',
      location: { coordinates: [103.8554, 1.3036], type: 'Point' },
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
          .success()
          .children(
            galaxy10
              .span({
                spanName: 'onCreate',
                spanType: 'app',
                spanSubtype: 'external',
                'service.target.type': 'http',
                'span.destination.service.resource': 'external',
              })
              .duration(50)
              .success()
              .timestamp(timestamp + 20),
            galaxy10
              .httpSpan({
                spanName: 'GET backend:1234',
                httpMethod: 'GET',
                httpUrl: 'https://backend:1234/api/start',
              })
              .duration(800)
              .success()
              .timestamp(timestamp + 400)
          ),
        galaxy10
          .transaction('Second View - View Appearing', 'Android Activity')
          .timestamp(10000 + timestamp)
          .duration(300)
          .failure()
          .children(
            galaxy10
              .httpSpan({
                spanName: 'GET backend:1234',
                httpMethod: 'GET',
                httpUrl: 'https://backend:1234/api/second',
              })
              .duration(400)
              .success()
              .timestamp(10000 + timestamp + 250)
          ),
        huaweiP2
          .transaction('Start View - View Appearing', 'huaweiP2 Activity')
          .timestamp(timestamp)
          .duration(20)
          .success()
          .children(
            huaweiP2
              .span({
                spanName: 'onCreate',
                spanType: 'app',
                spanSubtype: 'external',
                'service.target.type': 'http',
                'span.destination.service.resource': 'external',
              })
              .duration(50)
              .success()
              .timestamp(timestamp + 20),
            huaweiP2
              .httpSpan({
                spanName: 'GET backend:1234',
                httpMethod: 'GET',
                httpUrl: 'https://backend:1234/api/start',
              })
              .duration(800)
              .success()
              .timestamp(timestamp + 400)
          ),
        galaxy7
          .transaction('Start View - View Appearing', 'Android Activity')
          .timestamp(timestamp)
          .duration(20)
          .success()
          .children(
            galaxy7
              .span({
                spanName: 'onCreate',
                spanType: 'app',
                spanSubtype: 'external',
                'service.target.type': 'http',
                'span.destination.service.resource': 'external',
              })
              .duration(50)
              .success()
              .timestamp(timestamp + 20),
            galaxy7
              .httpSpan({
                spanName: 'GET backend:1234',
                httpMethod: 'GET',
                httpUrl: 'https://backend:1234/api/start',
              })
              .duration(800)
              .success()
              .timestamp(timestamp + 400)
          ),
      ];
    });
}
