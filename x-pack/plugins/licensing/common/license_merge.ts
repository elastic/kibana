/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { merge } from 'lodash';

export function licenseMerge(xpackInfo: any = {}) {
  const rawLicense = merge(
    {
      license: {
        uid: '00000000-0000-0000-0000-000000000000',
        type: 'basic',
        mode: 'basic',
        status: 'active',
      },
      features: {
        ccr: {
          available: false,
          enabled: true,
        },
        data_frame: {
          available: true,
          enabled: true,
        },
        graph: {
          available: false,
          enabled: true,
        },
        ilm: {
          available: true,
          enabled: true,
        },
        logstash: {
          available: false,
          enabled: true,
        },
        ml: {
          available: false,
          enabled: true,
        },
        monitoring: {
          available: true,
          enabled: true,
        },
        rollup: {
          available: true,
          enabled: true,
        },
        security: {
          available: true,
          enabled: true,
        },
        sql: {
          available: true,
          enabled: true,
        },
        vectors: {
          available: true,
          enabled: true,
        },
        voting_only: {
          available: true,
          enabled: true,
        },
        watcher: {
          available: false,
          enabled: true,
        },
      },
    },
    xpackInfo
  );

  if (xpackInfo.license === null) {
    Reflect.deleteProperty(rawLicense, 'license');
  }

  return rawLicense;
}
