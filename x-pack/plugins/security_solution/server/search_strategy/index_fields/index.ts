/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import isEmpty from 'lodash/isEmpty';
import {
  IFieldType,
  IndexPatternsFetcher,
  ISearchStrategy,
  PluginStart,
} from '../../../../../../src/plugins/data/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { FieldDescriptor } from '../../../../../../src/plugins/data/server/index_patterns';
import {
  IndexFieldsStrategyResponse,
  IndexField,
  IndexFieldsStrategyRequest,
  BeatFields,
  SourcererPatternType,
} from '../../../common/search_strategy/index_fields';
import { FactoryQueryTypes } from '../../../common/search_strategy/security_solution';

export const securitySolutionIndexFieldsProvider = <T extends FactoryQueryTypes>(
  data: PluginStart
): ISearchStrategy<IndexFieldsStrategyRequest, IndexFieldsStrategyResponse> => {
  // require the fields once we actually need them, rather than ahead of time, and pass
  // them to createFieldItem to reduce the amount of work done as much as possible
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const beatFields: BeatFields = require('../../utils/beat_schema/fields').fieldsBeat;
  const rawResponse = {
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
  };
  return {
    search: (request, options, { esClient, savedObjectsClient }) =>
      from(
        new Promise<IndexFieldsStrategyResponse>(async (resolve) => {
          let responsesIndexFields: FieldDescriptor[] | IFieldType[] = [];
          let selectedIndexNames: string[] = [];
          let indexFields: IndexField[] = [];
          const indexPatternsFetcher = new IndexPatternsFetcher(esClient.asCurrentUser);
          if (
            request.selectedPatterns.length === 1 &&
            request.selectedPatterns[0].id !== SourcererPatternType.config &&
            request.selectedPatterns[0].id !== SourcererPatternType.detections
          ) {
            const indexPatternsService = await data.indexPatterns.indexPatternsServiceFactory(
              savedObjectsClient,
              esClient.asCurrentUser
            );
            selectedIndexNames = [request.selectedPatterns[0].title];
            // selected pattern is a KIP, get fields from KIP API
            const ourPattern = await indexPatternsService
              .get(request.selectedPatterns[0].id)
              .catch(() => ({ fields: [] }));
            responsesIndexFields = ourPattern.fields;
          } else if (request.selectedPatterns.length > 0) {
            const activePatterns = dedupeIndexName(
              request.selectedPatterns.map(({ title }) => title)
            );
            selectedIndexNames = await indexPatternsFetcher
              .validatePatternListActive(activePatterns)
              .catch(() => []);
            responsesIndexFields =
              selectedIndexNames.length > 0 // getFieldsForWildcard returns all fields ever with an empty pattern
                ? await indexPatternsFetcher
                    .getFieldsForWildcard({
                      pattern: selectedIndexNames.join(),
                    })
                    .catch(() => [])
                : [];
          }
          if (!request.onlyCheckIfIndicesExist && responsesIndexFields.length > 0) {
            indexFields = await formatIndexFields(beatFields, responsesIndexFields);
          }

          return resolve({
            indexFields,
            indicesExist: selectedIndexNames,
            rawResponse,
          });
        })
      ),
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
 * @param beatFields The generated beat documentation
 * @param index The index its self
 */
export const createFieldItem = (
  beatFields: BeatFields,
  index: FieldDescriptor | IFieldType
): IndexField => {
  const splitIndexName = index.name.split('.');
  const indexName =
    splitIndexName[splitIndexName.length - 1] === 'text'
      ? splitIndexName.slice(0, splitIndexName.length - 1).join('.')
      : index.name;
  const beatIndex = beatFields[indexName] ?? {};
  if (isEmpty(beatIndex.category)) {
    beatIndex.category = splitIndexName[0];
  }
  return {
    ...beatIndex,
    ...index,
    aggregatable: index.aggregatable != null ? index.aggregatable : false,
    readFromDocValues: index.readFromDocValues != null ? index.readFromDocValues : false,
    searchable: index.searchable != null ? index.searchable : false,
  };
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
 * @param beatFields The generated beat documentation
 * @param responsesIndexFields  The response index fields to format
 */
export const formatFieldsResponsibly = async (
  beatFields: BeatFields,
  responsesIndexFields: FieldDescriptor[] | IFieldType[]
): Promise<IndexField[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        [...missingFields, ...responsesIndexFields].reduce(
          (accumulator: IndexField[], fieldDescriptor: FieldDescriptor | IFieldType) => {
            const item = createFieldItem(beatFields, fieldDescriptor);
            return [...accumulator, item];
          },
          []
        )
      );
    });
  });
};

/**
 * Formats the index fields into a format the UI wants.
 *
 * NOTE: This will have array sizes up to 4.7 megs in size at a time when being called.
 * This function should be as optimized as possible and should avoid any and all creation
 * of new arrays, iterating over the arrays or performing any n^2 operations.
 * @param beatFields The generated beat documentation
 * @param responsesIndexFields  The response index fields to format
 */
export const formatIndexFields = async (
  beatFields: BeatFields,
  responsesIndexFields: FieldDescriptor[] | IFieldType[]
): Promise<IndexField[]> => {
  const fields = await formatFieldsResponsibly(beatFields, responsesIndexFields);
  return fields;
};
