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
  esqlQuery: string;
}

export async function getESQLAdHocDataViewForSecuritySolution({
  dataViews,
  esqlQuery,
}: GetAdHocESQLDataView) {
  if (!dataViews) return;
  const dataViewObj = await getESQLAdHocDataview(esqlQuery, dataViews);
  return dataViewObj;
}
