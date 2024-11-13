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
    async ({ dataStreams$, soClient }) => {
      const [apmIndices, dataStreams] = await Promise.all([
        plugins.apmDataAccess.getApmIndices(soClient),
        lastValueFrom(dataStreams$),
      ]);

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
