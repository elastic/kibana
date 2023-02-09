/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';
import { EnterpriseSearchEngineIndex } from '../../../../../common/types/engines';

import { FetchEngineFieldCapabilitiesApiLogic } from '../../api/engines/fetch_engine_field_capabilities_api_logic';

import { EngineNameLogic } from './engine_name_logic';
import { EngineViewLogic } from './engine_view_logic';

export interface EngineOverviewActions {
  fetchEngineFieldCapabilities: typeof FetchEngineFieldCapabilitiesApiLogic.actions.makeRequest;
}
export interface EngineOverviewValues {
  documentsCount: number;
  engineData: typeof EngineViewLogic.values.engineData;
  engineFieldCapabilitiesApiStatus: typeof FetchEngineFieldCapabilitiesApiLogic.values.status;
  engineFieldCapabilitiesData: typeof FetchEngineFieldCapabilitiesApiLogic.values.data;
  engineName: typeof EngineNameLogic.values.engineName;
  fieldsCount: number;
  indices: EnterpriseSearchEngineIndex[];
  indicesCount: number;
  isLoadingEngine: typeof EngineViewLogic.values.isLoadingEngine;
}

export const EngineOverviewLogic = kea<MakeLogicType<EngineOverviewValues, EngineOverviewActions>>({
  actions: {},
  connect: {
    actions: [
      EngineNameLogic,
      ['setEngineName'],
      FetchEngineFieldCapabilitiesApiLogic,
      ['makeRequest as fetchEngineFieldCapabilities'],
    ],
    values: [
      EngineNameLogic,
      ['engineName'],
      EngineViewLogic,
      ['engineData', 'isLoadingEngine'],
      FetchEngineFieldCapabilitiesApiLogic,
      ['data as engineFieldCapabilitiesData', 'status as engineFieldCapabilitiesApiStatus'],
    ],
  },
  events: ({ actions, values }) => ({
    afterMount: () => {
      if (values.engineFieldCapabilitiesApiStatus !== Status.SUCCESS && !!values.engineName) {
        actions.fetchEngineFieldCapabilities({
          engineName: values.engineName,
        });
      }
    },
  }),
  listeners: ({ actions }) => ({
    setEngineName: ({ engineName }) => {
      actions.fetchEngineFieldCapabilities({ engineName });
    },
  }),
  path: ['enterprise_search', 'content', 'engine_overview_logic'],
  reducers: {},
  selectors: ({ selectors }) => ({
    documentsCount: [
      () => [selectors.indices],
      (indices: EngineOverviewValues['indices']) =>
        indices.reduce((sum, { count }) => sum + count, 0),
    ],
    fieldsCount: [
      () => [selectors.engineFieldCapabilitiesData],
      (engineFieldCapabilitiesData: EngineOverviewValues['engineFieldCapabilitiesData']) =>
        Object.values(engineFieldCapabilitiesData?.field_capabilities?.fields ?? {}).filter(
          (value) => !Object.values(value).some((field) => !!field.metadata_field)
        ).length,
    ],
    indices: [
      () => [selectors.engineData],
      (engineData: EngineOverviewValues['engineData']) => engineData?.indices ?? [],
    ],
    indicesCount: [
      () => [selectors.indices],
      (indices: EngineOverviewValues['indices']) => indices.length,
    ],
  }),
});
