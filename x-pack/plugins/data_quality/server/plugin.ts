/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';
import { PLUGIN_ID } from '../common';

import { Dependencies } from './types';

export class DataQualityPlugin implements Plugin<void, void, any, any> {
  public setup(coreSetup: CoreSetup, { features }: Dependencies) {
    features.registerElasticsearchFeature({
      id: PLUGIN_ID,
      management: {
        data: [PLUGIN_ID],
      },
      privileges: [
        {
          ui: [],
          requiredClusterPrivileges: [],
          requiredIndexPrivileges: {
            ['logs-*-*']: ['read'],
          },
        },
        {
          ui: [],
          requiredClusterPrivileges: [],
          requiredIndexPrivileges: {
            ['traces-*-*']: ['read'],
          },
        },
        {
          ui: [],
          requiredClusterPrivileges: [],
          requiredIndexPrivileges: {
            ['metrics-*-*']: ['read'],
          },
        },
        {
          ui: [],
          requiredClusterPrivileges: [],
          requiredIndexPrivileges: {
            ['synthetics-*-*']: ['read'],
          },
        },
      ],
    });
  }

  public start() {}

  public stop() {}
}
