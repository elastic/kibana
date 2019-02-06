/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { SearchSourceProvider } from 'ui/courier';
import { RequestAdapter } from 'ui/inspector/adapters';
import { MapAdapter } from './inspector/adapters/map_adapter';
import { timefilter } from 'ui/timefilter/timefilter';
import { getRequestInspectorStats, getResponseInspectorStats } from 'ui/courier/utils/courier_inspector_utils';

export const timeService = timefilter;
export let indexPatternService;
export let SearchSource;
export let emsServiceSettings;
export const inspectorAdapters = {
  requests: new RequestAdapter(),
  map: new MapAdapter(),
};

export async function fetchSearchSourceAndRecordWithInspector({ searchSource, requestId, requestName, requestDesc }) {
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
  emsServiceSettings = $injector.get('serviceSettings');
});
