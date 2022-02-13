/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { from } from 'rxjs';
import isEmpty from 'lodash/isEmpty';
import get from 'lodash/get';
import { ElasticsearchClient, StartServicesAccessor } from 'kibana/server';
import {
  IndexPatternsFetcher,
  ISearchStrategy,
  SearchStrategyDependencies,
} from '../../../../../../src/plugins/data/server';

import { DELETED_SECURITY_SOLUTION_DATA_VIEW } from '../../../common/constants';
import {
  IndexFieldsStrategyResponse,
  IndexField,
  IndexFieldsStrategyRequest,
  BeatFields,
} from '../../../common/search_strategy';
import { StartPlugins } from '../../types';
import type { FieldSpec } from '../../../../../../src/plugins/data_views/common';

const apmIndexPattern = 'apm-*-transaction*';
const apmDataStreamsPattern = 'traces-apm*';

export const indexFieldsProvider = (
  getStartServices: StartServicesAccessor<StartPlugins>
): ISearchStrategy<
  IndexFieldsStrategyRequest<'indices' | 'dataView'>,
  IndexFieldsStrategyResponse
> => {
  // require the fields once we actually need them, rather than ahead of time, and pass
  // them to createFieldItem to reduce the amount of work done as much as possible
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const beatFields: BeatFields = require('../../utils/beat_schema/fields').fieldsBeat;

  return {
    search: (request, options, deps) =>
      from(requestIndexFieldSearch(request, deps, beatFields, getStartServices)),
  };
};

export const findExistingIndices = async (
  indices: string[],
  esClient: ElasticsearchClient
): Promise<boolean[]> =>
  Promise.all(
    indices
      .map(async (index) => {
        if ([apmIndexPattern, apmDataStreamsPattern].includes(index)) {
          const searchResponse = await esClient.search({
            index,
            body: { query: { match_all: {} }, size: 0 },
          });
          return get(searchResponse, 'hits.total.value', 0) > 0;
        }
        const searchResponse = await esClient.fieldCaps({
          index,
          fields: '_id',
          ignore_unavailable: true,
          allow_no_indices: false,
        });
        return searchResponse.indices.length > 0;
      })
      .map((p) => p.catch((e) => false))
  );

export const requestIndexFieldSearch = async (
  request: IndexFieldsStrategyRequest<'indices' | 'dataView'>,
  { savedObjectsClient, esClient, request: kRequest }: SearchStrategyDependencies,
  beatFields: BeatFields,
  getStartServices: StartServicesAccessor<StartPlugins>
): Promise<IndexFieldsStrategyResponse> => {
  const indexPatternsFetcherAsCurrentUser = new IndexPatternsFetcher(esClient.asCurrentUser);
  const indexPatternsFetcherAsInternalUser = new IndexPatternsFetcher(esClient.asInternalUser);
  if ('dataViewId' in request && 'indices' in request) {
    throw new Error('Provide index field search with either `dataViewId` or `indices`, not both');
  }
  const [
    ,
    {
      data: { indexPatterns },
    },
  ] = await getStartServices();

  const dataViewService = await indexPatterns.dataViewsServiceFactory(
    savedObjectsClient,
    esClient.asCurrentUser,
    kRequest,
    true
  );

  let indicesExist: string[] = [];
  let indexFields: IndexField[] = [];
  let runtimeMappings = {};

  // if dataViewId is provided, get fields and indices from the Kibana Data View
  if ('dataViewId' in request) {
    let dataView;
    try {
      dataView = await dataViewService.get(request.dataViewId);
    } catch (r) {
      if (
        r.output.payload.statusCode === 404 &&
        // this is the only place this id is hard coded as there are no security_solution dependencies in timeline
        // needs to match value in DEFAULT_DATA_VIEW_ID security_solution/common/constants.ts
        r.output.payload.message.indexOf('security-solution') > -1
      ) {
        throw new Error(DELETED_SECURITY_SOLUTION_DATA_VIEW);
      } else {
        throw r;
      }
    }

    const patternList = dataView.title.split(',');
    indicesExist = (await findExistingIndices(patternList, esClient.asCurrentUser)).reduce(
      (acc: string[], doesIndexExist, i) => (doesIndexExist ? [...acc, patternList[i]] : acc),
      []
    );

    if (!request.onlyCheckIfIndicesExist) {
      const dataViewSpec = dataView.toSpec();
      const fieldDescriptor = [Object.values(dataViewSpec.fields ?? {})];
      runtimeMappings = dataViewSpec.runtimeFieldMap ?? {};
      indexFields = await formatIndexFields(beatFields, fieldDescriptor, patternList);
    }
  } else if ('indices' in request) {
    const patternList = dedupeIndexName(request.indices);
    indicesExist = (await findExistingIndices(patternList, esClient.asCurrentUser)).reduce(
      (acc: string[], doesIndexExist, i) => (doesIndexExist ? [...acc, patternList[i]] : acc),
      []
    );
    if (!request.onlyCheckIfIndicesExist) {
      const fieldDescriptor = await Promise.all(
        indicesExist.map(async (index, n) => {
          if (index.startsWith('.alerts-observability')) {
            return indexPatternsFetcherAsInternalUser.getFieldsForWildcard({
              pattern: index,
            });
          }
          return indexPatternsFetcherAsCurrentUser.getFieldsForWildcard({
            pattern: index,
          });
        })
      );
      indexFields = await formatIndexFields(beatFields, fieldDescriptor, patternList);
    }
  }

  return {
    indexFields,
    runtimeMappings,
    indicesExist,
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
            _id: '',
            _score: -1,
            _source: null,
          },
        ],
      },
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

const missingFields: FieldSpec[] = [
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
  beatFields: BeatFields,
  indexesAlias: string[],
  index: FieldSpec,
  indexesAliasIdx: number
): IndexField => {
  const alias = indexesAlias[indexesAliasIdx];
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
    // the format type on FieldSpec is SerializedFieldFormat
    // and is a string on beatIndex
    format: index.format?.id ?? beatIndex.format,
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
 * @param responsesFieldSpec The response index fields to loop over
 * @param indexesAlias The index aliases such as filebeat-*
 */
export const formatFirstFields = async (
  beatFields: BeatFields,
  responsesFieldSpec: FieldSpec[][],
  indexesAlias: string[]
): Promise<IndexField[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        responsesFieldSpec.reduce(
          (accumulator: IndexField[], fieldSpec: FieldSpec[], indexesAliasIdx: number) => {
            missingFields.forEach((index) => {
              const item = createFieldItem(beatFields, indexesAlias, index, indexesAliasIdx);
              accumulator.push(item);
            });
            fieldSpec.forEach((index) => {
              const item = createFieldItem(beatFields, indexesAlias, index, indexesAliasIdx);
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
 * @param responsesFieldSpec  The response index fields to format
 * @param indexesAlias The index alias
 */
export const formatIndexFields = async (
  beatFields: BeatFields,
  responsesFieldSpec: FieldSpec[][],
  indexesAlias: string[]
): Promise<IndexField[]> => {
  const fields = await formatFirstFields(beatFields, responsesFieldSpec, indexesAlias);
  const secondFields = await formatSecondFields(fields);
  return secondFields;
};
