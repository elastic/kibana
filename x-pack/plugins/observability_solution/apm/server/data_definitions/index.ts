/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { APMPluginSetupDependencies, APMPluginStartDependencies } from '../types';

export function registerDataDefinitions({
  coreSetup,
  plugins,
}: {
  coreSetup: CoreSetup<APMPluginStartDependencies>;
  plugins: APMPluginSetupDependencies;
}) {
  plugins.dataDefinitionRegistry?.registerStaticDataDefinition(
    { id: 'apm' },
    async ({
      dataStreams,
      soClient,
    }): Promise<
      | {
          readonly transaction_duration: {
            readonly label: string;
            readonly properties: {};
            readonly schema: {
              readonly type: 'object';
              readonly properties: {
                readonly serviceName: { readonly type: 'string' };
                readonly aggregationType: {
                  readonly type: 'string';
                  readonly enum: readonly ['avg', 'p90', 'p99'];
                };
              };
            };
          };
        }
      | { readonly transaction_duration?: undefined }
    > => {
      const apmIndices = await plugins.apmDataAccess.getApmIndices(soClient);

      if (dataStreams.matches(apmIndices.metric)) {
        return {
          ['transaction_duration']: {
            label: i18n.translate('xpack.apm.dataDefinitions.metrics.transactionDuration', {
              defaultMessage: 'Transaction duration',
            }),
            properties: {},
            schema: {
              type: 'object',
              properties: {
                serviceName: {
                  type: 'string',
                },
                aggregationType: {
                  type: 'string',
                  enum: ['avg', 'p90', 'p99'],
                },
              },
            },
          },
        };
      }

      return {};
    },
    async (result) => {
      return [];
    }
  );
}
