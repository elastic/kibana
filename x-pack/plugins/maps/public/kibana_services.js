/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { SearchSourceProvider } from 'ui/courier';
import { FilterBarQueryFilterProvider } from 'ui/filter_manager/query_filter';
import { getRequestInspectorStats, getResponseInspectorStats } from 'ui/courier/utils/courier_inspector_utils';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';

export let indexPatternService;
export let SearchSource;
export let filterBarQueryFilter;
export let xpackInfo;

export async function fetchSearchSourceAndRecordWithInspector({ searchSource, requestId, requestName, requestDesc, inspectorAdapters }) {
  const inspectorRequest = inspectorAdapters.requests.start(
    requestName,
    { id: requestId, description: requestDesc });
  let resp;
  try {
    inspectorRequest.stats(getRequestInspectorStats(searchSource));
    searchSource.getSearchRequestBody().then(body => {
      inspectorRequest.json(body);
    });
    resp = await searchSource.fetch();
    inspectorRequest
      .stats(getResponseInspectorStats(searchSource, resp))
      .ok({ json: resp });
  } catch(error) {
    inspectorRequest.error({ error });
    throw error;
  }

  return resp;
}

uiModules.get('app/maps').run(($injector) => {
  indexPatternService = $injector.get('indexPatterns');
  const Private = $injector.get('Private');
  SearchSource = Private(SearchSourceProvider);
  filterBarQueryFilter = Private(FilterBarQueryFilterProvider);
  xpackInfo = Private(XPackInfoProvider);
});
