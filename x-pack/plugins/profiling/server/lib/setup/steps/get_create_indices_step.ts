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
const SYMBOLS_INDEX = 'profiling-symbols';
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
      const nonKvIndices = [SQ_EXECUTABLES_INDEX, LEAFFRAMES_INDEX, SYMBOLS_INDEX, ILM_LOCK_INDEX];

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
          })
          .catch(catchResourceAlreadyExistsException),
        esClient.indices
          .create({
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
          })
          .catch(catchResourceAlreadyExistsException),
        esClient.indices
          .create({
            index: SYMBOLS_INDEX,
            settings: {
              index: {
                number_of_shards: '16',
                refresh_interval: '10s',
              },
            },
            mappings: {
              _source: {
                enabled: true,
              } as MappingSourceField,
              properties: {
                'ecs.version': {
                  type: 'keyword',
                  index: true,
                  doc_values: false,
                  store: false,
                },
                'Symbol.function.name': {
                  // name of the function
                  type: 'keyword',
                  index: false,
                  doc_values: false,
                  store: false,
                },
                'Symbol.file.name': {
                  // file path
                  type: 'keyword',
                  index: false,
                  doc_values: false,
                  store: false,
                },
                'Symbol.call.file.name': {
                  // (for inlined functions) file path where inline function was called
                  type: 'keyword',
                  index: false,
                  doc_values: false,
                  store: false,
                },
                'Symbol.call.line': {
                  // (for inlined functions) line where inline function was called
                  type: 'integer',
                  index: false,
                  doc_values: false,
                  store: false,
                },
                'Symbol.function.line': {
                  // function start line (only available from DWARF). Currently unused.
                  type: 'integer',
                  index: false,
                  doc_values: false,
                  store: false,
                },
                'Symbol.depth': {
                  // inline depth
                  type: 'integer',
                  index: false,
                  doc_values: false,
                  store: false,
                },
                // pairs of (32bit PC offset, 32bit line number) followed by 64bit PC range base at the end.
                // To find line number for a given PC: find lowest offset such as offsetBase+PC >= offset, then read corresponding line number.
                // offsetBase could seemingly be available from exec_pc_range (it's the first value of the pair), but it's not the case.
                // Ranges are stored as points, which cannot be retrieve when disabling _source.
                // See https://www.elastic.co/guide/en/elasticsearch/reference/current/point.html .
                'Symbol.linetable.base': {
                  // Linetable: base for offsets (64bit PC range base)
                  type: 'unsigned_long',
                  index: false,
                  doc_values: false,
                  store: false,
                },
                'Symbol.linetable.length': {
                  // Linetable: length of range (PC range is [base, base+length))
                  type: 'unsigned_long',
                  index: false,
                  doc_values: false,
                  store: false,
                },
                'Symbol.linetable.offsets': {
                  // Linetable: concatenated offsets (each value is ULEB128encoded)
                  type: 'keyword',
                  index: false,
                  doc_values: false,
                  store: false,
                },
                'Symbol.linetable.lines': {
                  // Linetable: concatenated lines (each value is ULEB128 encoded)
                  type: 'keyword',
                  index: false,
                  doc_values: false,
                  store: false,
                },
                'Symbol.file.id': {
                  // fileID. used for deletion and Symbol.exec.pcrange collision handling on symbolization
                  type: 'keyword',
                  index: true,
                  doc_values: false,
                  store: false,
                },
                'Symbol.exec.pcrange': {
                  // PC ranges [begin, end)
                  type: 'ip_range',
                  index: true,
                  doc_values: false,
                  store: false,
                },
              },
            },
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
