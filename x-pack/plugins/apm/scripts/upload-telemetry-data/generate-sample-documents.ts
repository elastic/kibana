/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { DeepPartial } from 'utility-types';
import {
  merge,
  omit,
  defaultsDeep,
  range,
  mapValues,
  isPlainObject,
  flatten,
} from 'lodash';
import uuid from 'uuid';
import {
  CollectTelemetryParams,
  collectDataTelemetry,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../server/lib/apm_telemetry/collect_data_telemetry';

interface GenerateOptions {
  days: number;
  instances: number;
  variation: {
    min: number;
    max: number;
  };
}

const randomize = (
  value: unknown,
  instanceVariation: number,
  dailyGrowth: number
) => {
  if (typeof value === 'boolean') {
    return Math.random() > 0.5;
  }
  if (typeof value === 'number') {
    return Math.round(instanceVariation * dailyGrowth * value);
  }
  return value;
};

const mapValuesDeep = (
  obj: Record<string, any>,
  iterator: (value: unknown, key: string, obj: Record<string, any>) => unknown
): Record<string, any> =>
  mapValues(obj, (val, key) =>
    isPlainObject(val) ? mapValuesDeep(val, iterator) : iterator(val, key!, obj)
  );

export async function generateSampleDocuments(
  options: DeepPartial<GenerateOptions> & {
    collectTelemetryParams: CollectTelemetryParams;
  }
) {
  const { collectTelemetryParams, ...preferredOptions } = options;

  const opts: GenerateOptions = defaultsDeep(
    {
      days: 100,
      instances: 50,
      variation: {
        min: 0.1,
        max: 4,
      },
    },
    preferredOptions
  );

  const sample = await collectDataTelemetry(collectTelemetryParams);

  console.log('Collected telemetry'); // eslint-disable-line no-console
  console.log('\n' + JSON.stringify(sample, null, 2)); // eslint-disable-line no-console

  const dateOfScriptExecution = new Date();

  return flatten(
    range(0, opts.instances).map(() => {
      const instanceId = uuid.v4();
      const defaults = {
        cluster_uuid: instanceId,
        stack_stats: {
          kibana: {
            versions: {
              version: '8.0.0',
            },
          },
        },
      };

      const instanceVariation =
        Math.random() * (opts.variation.max - opts.variation.min) +
        opts.variation.min;

      return range(0, opts.days).map((dayNo) => {
        const dailyGrowth = Math.pow(1.005, opts.days - 1 - dayNo);

        const timestamp = Date.UTC(
          dateOfScriptExecution.getFullYear(),
          dateOfScriptExecution.getMonth(),
          -dayNo
        );

        const generated = mapValuesDeep(omit(sample, 'versions'), (value) =>
          randomize(value, instanceVariation, dailyGrowth)
        );

        return merge({}, defaults, {
          timestamp,
          stack_stats: {
            kibana: {
              plugins: {
                apm: merge({}, sample, generated),
              },
            },
          },
        });
      });
    })
  );
}
