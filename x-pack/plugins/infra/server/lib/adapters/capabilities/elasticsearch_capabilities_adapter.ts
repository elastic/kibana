/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraBackendFrameworkAdapter, InfraFrameworkRequest } from '../framework';
import { InfraCapabilitiesAdapter } from './adapter_types';

import { InfraSourceConfiguration } from '../../sources';

export class ElasticsearchCapabilitiesAdapter implements InfraCapabilitiesAdapter {
  private framework: InfraBackendFrameworkAdapter;
  constructor(framework: InfraBackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async getMetricCapabilities(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeName: string
  ): Promise<any> {
    const metricQuery = {
      index: sourceConfiguration.metricAlias,
      body: {
        query: {
          match: {
            ['host.name']: nodeName,
          },
        },
        size: 0,
        aggs: {
          metrics: {
            terms: {
              field: 'metricset.module',
              size: 1000,
            },
            aggs: {
              names: {
                terms: {
                  field: 'metricset.name',
                  size: 1000,
                },
              },
            },
          },
        },
      },
    };

    return this.framework.callWithRequest<any>(req, 'search', metricQuery);
  }

  public async getLogCapabilities(
    req: InfraFrameworkRequest,
    sourceConfiguration: InfraSourceConfiguration,
    nodeName: string
  ): Promise<any> {
    const logQuery = {
      index: sourceConfiguration.logAlias,
      body: {
        query: {
          match: {
            ['host.name']: nodeName,
          },
        },
        size: 0,
        aggs: {
          metrics: {
            terms: {
              field: 'fileset.module',
              size: 1000,
            },
            aggs: {
              names: {
                terms: {
                  field: 'fileset.name',
                  size: 1000,
                },
              },
            },
          },
        },
      },
    };

    return this.framework.callWithRequest<any>(req, 'search', logQuery);
  }
}
