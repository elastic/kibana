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
    async ({ soClient }) => {
      const apmIndices = await plugins.apmDataAccess.getApmIndices(soClient);

      return [
        {
          index: Object.values(apmIndices),
          query: {
            match_all: {},
          },
        },
      ];
    },
    async ({}) => {
      return {
        ['transaction_duration']: {
          label: i18n.translate('xpack.apm.dataDefinitions.metrics.transactionDuration', {
            defaultMessage: 'Transaction duration',
          }),
          schema: {
            type: 'object',
            properties: {
              aggregationType: {
                type: 'string',
                enum: ['avg', 'p90', 'p99'],
              },
            },
          },
        } as const,
      };
    },
    async ({ metrics }) => {
      return [];
    }
  );
}
