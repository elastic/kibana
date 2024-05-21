/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import {} from '@kbn/data-views-plugin/common';
import type { PluginStartDependencies } from '@kbn/security-plugin/public/plugin';
import { getESQLAdHocDataview } from '@kbn/esql-utils';
import { sha256 } from '@kbn/esql-utils/src/utils/sha256';

const getDataViewFromFieldSpec = async (
  fieldSpecMap: DataViewFieldMap,

  dataViews: PluginStartDependencies['dataViews']
) => {
  if (!fieldSpecMap) return;
  if (!dataViews) return;

  const dataViewIdString = `esql-dataView-${Object.values(fieldSpecMap)
    .map((field) => field.name)
    .join('-')}`;

  const dataViewId = await sha256(dataViewIdString);

  const dataViewObj = await dataViews.create({
    title: '',
    type: 'esql',
    id: dataViewId,
    fields: fieldSpecMap,
  });

  return dataViewObj;
};

const getDataViewBasedOnIndexPattern = async (dataView: PluginStartDependencies['dataViews']) => {
  if (!dataViews) return;
  /*
   * if indexPatternFromQuery is undefined, it means that the user used the ROW or SHOW META / SHOW INFO
   * source-commands. In this case, make no changes to the dataView Object
   *
   */
  if (!indexPatternFromQuery) return;
  const dataViewObj = await getESQLAdHocDataview(indexPatternFromQuery, dataViews);

  /*
   *
   * If the indexPatternFromQuery is empty string means that the user used either the ROW or SHOW META / SHOW INFO commands
   * we don't want to add the @timestamp field in this case : https://github.com/elastic/kibana/issues/163417
   *
   * ESQL Ref: https://www.elastic.co/guide/en/elasticsearch/reference/master/esql-commands.html
   *
   */
  if (indexPatternFromQuery && dataViewObj.fields.getByName('@timestamp')?.type === 'date') {
    dataViewObj.timeFieldName = '@timestamp';
  }

  return dataViewObj;
};

const esqlDataViewCreationStrategy = {
  getDataViewFromFieldSpec,
  getDataViewBasedOnIndexPattern,
};
