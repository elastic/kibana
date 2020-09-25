/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import isEmpty from 'lodash/isEmpty';
import { IndexPatternsFetcher, ISearchStrategy } from '../../../../../../src/plugins/data/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FieldDescriptor } from '../../../../../../src/plugins/data/server/index_patterns';
import {
  IndexFieldsStrategyResponse,
  IndexField,
  IndexFieldsStrategyRequest,
} from '../../../common/search_strategy/index_fields';

import { fieldsBeat } from '../../utils/beat_schema/fields';

export const securitySolutionIndexFieldsProvider = (): ISearchStrategy<
  IndexFieldsStrategyRequest,
  IndexFieldsStrategyResponse
> => {
  return {
    search: async (context, request) => {
      const { elasticsearch } = context.core;
      const indexPatternsFetcher = new IndexPatternsFetcher(
        elasticsearch.legacy.client.callAsCurrentUser
      );
      const dedupeIndices = dedupeIndexName(request.indices);

      const responsesIndexFields = await Promise.all(
        dedupeIndices
          .map((index) =>
            indexPatternsFetcher.getFieldsForWildcard({
              pattern: index,
            })
          )
          .map((p) => p.catch((e) => false))
      );
      let indexFields: IndexField[] = [];

      if (!request.onlyCheckIfIndicesExist) {
        indexFields = await formatIndexFields(
          responsesIndexFields.filter((rif) => rif !== false) as FieldDescriptor[][],
          dedupeIndices
        );
      }

      return Promise.resolve({
        indexFields,
        indicesExist: dedupeIndices.filter((index, i) => responsesIndexFields[i] !== false),
        rawResponse: {
          timed_out: false,
          took: -1,
          _shards: {
            total: -1,
            successful: -1,
            failed: -1,
            skipped: -1,
          },
          hits: {
            total: -1,
            max_score: -1,
            hits: [
              {
                _index: '',
                _type: '',
                _id: '',
                _score: -1,
                _source: null,
              },
            ],
          },
        },
      });
    },
  };
};

export const dedupeIndexName = (indices: string[]) =>
  indices.reduce<string[]>((acc, index) => {
    if (index.trim() !== '' && index.trim() !== '_all' && !acc.includes(index.trim())) {
      return [...acc, index];
    }
    return acc;
  }, []);

const missingFields: FieldDescriptor[] = [
  {
    name: '_id',
    type: 'string',
    searchable: true,
    aggregatable: false,
    readFromDocValues: false,
    esTypes: [],
  },
  {
    name: '_index',
    type: 'string',
    searchable: true,
    aggregatable: true,
    readFromDocValues: false,
    esTypes: [],
  },
];

/**
 * Creates a single field item.
 *
 * This is a mutatious HOT CODE PATH function that will have array sizes up to 4.7 megs
 * in size at a time calling this function repeatedly. This function should be as optimized as possible
 * and should avoid any and all creation of new arrays, iterating over the arrays or performing
 * any n^2 operations.
 * @param indexesAlias The index alias
 * @param index The index its self
 * @param indexesAliasIdx The index within the alias
 */
export const createFieldItem = (
  indexesAlias: string[],
  index: FieldDescriptor,
  indexesAliasIdx: number
): IndexField => {
  const alias = indexesAlias[indexesAliasIdx];
  return {
    ...(fieldsBeat[index.name] ?? {}),
    ...index,
    indexes: [alias],
  };
};

/**
 * This is a mutatious HOT CODE PATH function that will have array sizes up to 4.7 megs
 * in size at a time when being called. This function should be as optimized as possible
 * and should avoid any and all creation of new arrays, iterating over the arrays or performing
 * any n^2 operations. The `.push`, and `forEach` operations are expected within this function
 * to speed up performance.
 *
 * This intentionally waits for the next tick on the event loop to process as the large 4.7 megs
 * has already consumed a lot of the event loop processing up to this function and we want to give
 * I/O opportunity to occur by scheduling this on the next loop.
 * @param responsesIndexFields The response index fields to loop over
 * @param indexesAlias The index aliases such as filebeat-*
 */
export const formatFirstFields = async (
  responsesIndexFields: FieldDescriptor[][],
  indexesAlias: string[]
): Promise<IndexField[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        responsesIndexFields.reduce(
          (accumulator: IndexField[], indexFields: FieldDescriptor[], indexesAliasIdx: number) => {
            missingFields.forEach((index) => {
              const item = createFieldItem(indexesAlias, index, indexesAliasIdx);
              accumulator.push(item);
            });
            indexFields.forEach((index) => {
              const item = createFieldItem(indexesAlias, index, indexesAliasIdx);
              accumulator.push(item);
            });
            return accumulator;
          },
          []
        )
      );
    });
  });
};

/**
 * This is a mutatious HOT CODE PATH function that will have array sizes up to 4.7 megs
 * in size at a time when being called. This function should be as optimized as possible
 * and should avoid any and all creation of new arrays, iterating over the arrays or performing
 * any n^2 operations. The `.push`, and `forEach` operations are expected within this function
 * to speed up performance. The "indexFieldNameHash" side effect hash avoids additional expensive n^2
 * look ups.
 *
 * This intentionally waits for the next tick on the event loop to process as the large 4.7 megs
 * has already consumed a lot of the event loop processing up to this function and we want to give
 * I/O opportunity to occur by scheduling this on the next loop.
 * @param fields The index fields to create the secondary fields for
 */
export const formatSecondFields = async (fields: IndexField[]): Promise<IndexField[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const indexFieldNameHash: Record<string, number> = {};
      const reduced = fields.reduce((accumulator: IndexField[], indexfield: IndexField) => {
        const alreadyExistingIndexField = indexFieldNameHash[indexfield.name];
        if (alreadyExistingIndexField != null) {
          const existingIndexField = accumulator[alreadyExistingIndexField];
          if (isEmpty(accumulator[alreadyExistingIndexField].description)) {
            accumulator[alreadyExistingIndexField].description = indexfield.description;
          }
          accumulator[alreadyExistingIndexField].indexes = Array.from(
            new Set([...existingIndexField.indexes, ...indexfield.indexes])
          );
          return accumulator;
        }
        accumulator.push(indexfield);
        indexFieldNameHash[indexfield.name] = accumulator.length - 1;
        return accumulator;
      }, []);
      resolve(reduced);
    });
  });
};

/**
 * Formats the index fields into a format the UI wants.
 *
 * NOTE: This will have array sizes up to 4.7 megs in size at a time when being called.
 * This function should be as optimized as possible and should avoid any and all creation
 * of new arrays, iterating over the arrays or performing any n^2 operations.
 * @param responsesIndexFields  The response index fields to format
 * @param indexesAlias The index alias
 */
export const formatIndexFields = async (
  responsesIndexFields: FieldDescriptor[][],
  indexesAlias: string[]
): Promise<IndexField[]> => {
  const fields = await formatFirstFields(responsesIndexFields, indexesAlias);
  const secondFields = await formatSecondFields(fields);
  return secondFields;
};
