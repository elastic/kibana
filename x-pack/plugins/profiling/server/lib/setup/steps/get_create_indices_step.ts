/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingSourceField } from '@elastic/elasticsearch/lib/api/types';
import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';
import { catchResourceAlreadyExistsException } from './catch_resource_already_exists_exception';

const SQ_EXECUTABLES_INDEX = 'profiling-sq-executables';
const LEAFFRAMES_INDEX = 'profiling-sq-leafframes';
const ILM_LOCK_INDEX = '.profiling-ilm-lock';

const getKeyValueIndices = () => {
  const kvIndices = ['profiling-stacktraces', 'profiling-stackframes', 'profiling-executables'];

  const pairs: Array<{ index: string; alias: string }> = kvIndices.flatMap((index) => {
    return [
      { index: `${index}-000001`, alias: index },
      { index: `${index}-000002`, alias: `${index}-next` },
    ];
  });

  return pairs;
};

export function getCreateIndicesStep({
  client,
  logger,
}: ProfilingSetupStepFactoryOptions): ProfilingSetupStep {
  const esClient = client.getEsClient();
  const keyValueIndices = getKeyValueIndices();

  return {
    name: 'create_indices',
    hasCompleted: async () => {
      const nonKvIndices = [SQ_EXECUTABLES_INDEX, LEAFFRAMES_INDEX, ILM_LOCK_INDEX];

      const results = await Promise.all([
        esClient.cat
          .indices({
            index: keyValueIndices
              .map(({ index }) => index)
              .concat(nonKvIndices)
              .map((index) => index + '*')
              .join(','),
            format: 'json',
          })
          .then((response) => {
            const allIndices = response.map((index) => index.index!);

            const missingIndices = keyValueIndices
              .map(({ index }) => index)
              .concat(nonKvIndices)
              .filter((index) => !allIndices.includes(index));

            if (missingIndices.length) {
              logger.debug(`Missing indices: ${missingIndices.join(',')}`);
            }

            return missingIndices.length === 0;
          })
          .catch((error) => {
            logger.debug(`Failed fetching indices: ${error}`);
            return Promise.resolve(false);
          }),
        esClient.cat
          .aliases({
            name: keyValueIndices.map(({ alias }) => alias + '*').join(','),
            format: 'json',
          })
          .then((response) => {
            const allAliases = response.map((index) => index.alias!);

            const missingAliases = keyValueIndices
              .map(({ alias }) => alias)
              .filter((alias) => !allAliases.includes(alias));

            if (missingAliases.length) {
              logger.debug(`Missing aliases: ${missingAliases.join(',')}`);
            }

            return missingAliases.length === 0;
          })
          .catch((error) => {
            logger.debug(`Failed fetching aliases: ${error}`);
            return Promise.resolve(false);
          }),
      ]);

      return results.every(Boolean);
    },
    init: async () => {
      await Promise.all([
        ...keyValueIndices.map(({ index, alias }) => {
          return esClient.indices
            .create({
              index,
              aliases: {
                [alias]: {
                  is_write_index: true,
                },
              },
            })
            .catch(catchResourceAlreadyExistsException);
        }),
        esClient.indices.create({
          index: SQ_EXECUTABLES_INDEX,
          settings: {
            index: {
              refresh_interval: '10s',
            },
          },
          mappings: {
            _source: {
              mode: 'synthetic',
            } as MappingSourceField,
            properties: {
              'ecs.version': {
                type: 'keyword',
                index: true,
              },
              'Executable.file.id': {
                type: 'keyword',
                index: false,
              },
              'Time.created': {
                type: 'date',
                index: true,
              },
              'Symbolization.time.next': {
                type: 'date',
                index: true,
              },
              'Symbolization.retries': {
                type: 'short',
                index: true,
              },
            },
          },
        }),
        esClient.indices.create({
          index: LEAFFRAMES_INDEX,
          settings: {
            index: {
              refresh_interval: '10s',
            },
          },
          mappings: {
            _source: {
              mode: 'synthetic',
            } as MappingSourceField,
            properties: {
              'ecs.version': {
                type: 'keyword',
                index: true,
              },
              'Stacktrace.frame.id': {
                type: 'keyword',
                index: false,
              },
              'Time.created': {
                type: 'date',
                index: true,
              },
              'Symbolization.time.next': {
                type: 'date',
                index: true,
              },
              'Symbolization.retries': {
                type: 'short',
                index: true,
              },
            },
          },
        }),
        esClient.indices.create({
          index: ILM_LOCK_INDEX,
          settings: {
            index: {
              hidden: true,
            },
          },
          mappings: {
            properties: {
              '@timestamp': {
                type: 'date',
                format: 'epoch_second',
              },
              phase: {
                type: 'keyword',
              },
            },
          },
        }),
      ]);
    },
  };
}
