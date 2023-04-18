/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProfilingSetupStep, ProfilingSetupStepFactoryOptions } from '../types';
import { catchResourceAlreadyExistsException } from './catch_resource_already_exists_exception';
import profilingReturnpadsPrivateMapping from './mappings/profiling_returnpads_private.json';
import profilingSymbolsPrivateMapping from './mappings/profiling_symbols_private.json';
import profilingSymbolsMapping from './mappings/profiling_symbols.json';
import profilingSQLeafframesMapping from './mappings/profiling_sq_leafframes.json';
import profilingSQExecutablesMapping from './mappings/profiling_sq_executables.json';

const RETURNPADS_PRIVATE_INDEX = 'profiling-returnpads-private';
const SQ_EXECUTABLES_INDEX = 'profiling-sq-executables';
const SQ_LEAFFRAMES_INDEX = 'profiling-sq-leafframes';
const SYMBOLS_INDEX = 'profiling-symbols';
const SYMBOLS_PRIVATE_INDEX = 'profiling-symbols-private';
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
      const nonKvIndices = [
        RETURNPADS_PRIVATE_INDEX,
        SQ_EXECUTABLES_INDEX,
        SQ_LEAFFRAMES_INDEX,
        SYMBOLS_INDEX,
        SYMBOLS_PRIVATE_INDEX,
        ILM_LOCK_INDEX,
      ];

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
        esClient.indices
          .create({
            index: SQ_EXECUTABLES_INDEX,
            ...profilingSQExecutablesMapping,
          })
          .catch(catchResourceAlreadyExistsException),
        esClient.indices
          .create({
            index: SQ_LEAFFRAMES_INDEX,
            ...profilingSQLeafframesMapping,
          })
          .catch(catchResourceAlreadyExistsException),
        esClient.indices
          .create({
            index: SYMBOLS_INDEX,
            ...profilingSymbolsMapping,
          })
          .catch(catchResourceAlreadyExistsException),
        esClient.indices
          .create({
            index: SYMBOLS_PRIVATE_INDEX,
            ...profilingSymbolsPrivateMapping,
          })
          .catch(catchResourceAlreadyExistsException),
        esClient.indices
          .create({
            index: RETURNPADS_PRIVATE_INDEX,
            ...profilingReturnpadsPrivateMapping,
          })
          .catch(catchResourceAlreadyExistsException),
        esClient.indices
          .create({
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
          })
          .catch(catchResourceAlreadyExistsException),
      ]);
    },
  };
}
