/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUiSettingsClient, SavedObjectsClientContract } from 'kibana/server';
import { EsQueryConfig } from 'src/plugins/data/server';
import {
  esQuery,
  Filter,
  IIndexPattern,
  Query,
} from '../../../../../../../src/plugins/data/server';
import {
  DocValueFields,
  IndexPatternField,
  JobParamsPanelCsv,
  QueryFilter,
  SavedSearchObjectAttributes,
  SearchPanel,
  SearchSource,
} from '../types';
import { getDataSource } from './get_data_source';
import { getFilters } from './get_filters';
import { GenerateCsvParams } from '../../csv/generate_csv';

export const getEsQueryConfig = async (config: IUiSettingsClient) => {
  const configs = await Promise.all([
    config.get('query:allowLeadingWildcards'),
    config.get('query:queryString:options'),
    config.get('courier:ignoreFilterIfFieldNotInIndex'),
  ]);
  const [allowLeadingWildcards, queryStringOptions, ignoreFilterIfFieldNotInIndex] = configs;
  return {
    allowLeadingWildcards,
    queryStringOptions,
    ignoreFilterIfFieldNotInIndex,
  } as EsQueryConfig;
};

/*
 * Create a CSV Job object for CSV From SavedObject to use as a job parameter
 * for generateCsv
 */
export const getGenerateCsvParams = async (
  jobParams: JobParamsPanelCsv,
  panel: SearchPanel,
  savedObjectsClient: SavedObjectsClientContract,
  uiConfig: IUiSettingsClient
): Promise<GenerateCsvParams> => {
  let timerange;
  if (jobParams.post?.timerange) {
    timerange = jobParams.post?.timerange;
  } else {
    timerange = panel.timerange;
  }
  const { indexPatternSavedObjectId } = panel;
  const savedSearchObjectAttr = panel.attributes as SavedSearchObjectAttributes;
  const { indexPatternSavedObject } = await getDataSource(
    savedObjectsClient,
    indexPatternSavedObjectId
  );
  const esQueryConfig = await getEsQueryConfig(uiConfig);

  const {
    kibanaSavedObjectMeta: {
      searchSource: {
        filter: [searchSourceFilter],
        query: searchSourceQuery,
      },
    },
  } = savedSearchObjectAttr as { kibanaSavedObjectMeta: { searchSource: SearchSource } };

  const {
    timeFieldName: indexPatternTimeField,
    title: esIndex,
    fields: indexPatternFields,
  } = indexPatternSavedObject;

  let payloadQuery: QueryFilter | undefined;
  let payloadSort: any[] = [];
  let docValueFields: DocValueFields[] | undefined;
  if (jobParams.post && jobParams.post.state) {
    ({
      post: {
        state: { query: payloadQuery, sort: payloadSort = [], docvalue_fields: docValueFields },
      },
    } = jobParams);
  }
  const { includes, combinedFilter } = getFilters(
    indexPatternSavedObjectId,
    indexPatternTimeField,
    timerange,
    savedSearchObjectAttr,
    searchSourceFilter,
    payloadQuery
  );

  const savedSortConfigs = savedSearchObjectAttr.sort;
  const sortConfig = [...payloadSort];
  savedSortConfigs.forEach(([savedSortField, savedSortOrder]) => {
    sortConfig.push({ [savedSortField]: { order: savedSortOrder } });
  });

  const scriptFieldsConfig =
    indexPatternFields &&
    indexPatternFields
      .filter((f: IndexPatternField) => f.scripted)
      .reduce((accum: any, curr: IndexPatternField) => {
        return {
          ...accum,
          [curr.name]: {
            script: {
              source: curr.script,
              lang: curr.lang,
            },
          },
        };
      }, {});

  const searchRequest = {
    index: esIndex,
    body: {
      _source: { includes },
      docvalue_fields: docValueFields,
      query: esQuery.buildEsQuery(
        indexPatternSavedObject as IIndexPattern,
        (searchSourceQuery as unknown) as Query,
        (combinedFilter as unknown) as Filter,
        esQueryConfig
      ),
      script_fields: scriptFieldsConfig,
      sort: sortConfig,
    },
  };

  return {
    jobParams: { browserTimezone: timerange.timezone },
    indexPatternSavedObject,
    searchRequest,
    fields: includes,
    metaFields: [],
    conflictedTypesFields: [],
  };
};
