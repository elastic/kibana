/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLAdHocDataview } from '@kbn/esql-utils';
import type { PluginStartDependencies } from '@kbn/security-plugin/public/plugin';

export interface GetAdHocESQLDataView {
  dataViews: PluginStartDependencies['dataViews'];
  indexPattern: string;
}

export async function getESQLAdHocDataViewForSecuritySolution({
  dataViews,
  indexPattern,
}: GetAdHocESQLDataView) {
  if (!dataViews) return;
  const dataViewObj = await getESQLAdHocDataview(indexPattern, dataViews);

  /*
   *
   * If the indexPatternFromQuery is empty string means that the user used either the ROW or SHOW META / SHOW INFO commands
   * we don't want to add the @timestamp field in this case : https://github.com/elastic/kibana/issues/163417
   *
   * ESQL Ref: https://www.elastic.co/guide/en/elasticsearch/reference/master/esql-commands.html
   *
   */
  if (indexPattern && dataViewObj.fields.getByName('@timestamp')?.type === 'date') {
    dataViewObj.timeFieldName = '@timestamp';
  }

  return dataViewObj;
}
