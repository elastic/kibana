/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Capabilities } from '@kbn/core-capabilities-common';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import {
  AggregateQuery,
  EsQueryConfig,
  ExecutionContextSearch,
  Filter,
  isOfAggregateQueryType,
  isOfQueryType,
  Query,
  TimeRange,
} from '@kbn/es-query';
import {
  PublishingSubject,
  StateComparators,
  getUnchangingComparator,
} from '@kbn/presentation-publishing';
import { HasDynamicActions } from '@kbn/embeddable-enhanced-plugin/public';
import { DynamicActionsSerializedState } from '@kbn/embeddable-enhanced-plugin/public/plugin';
import { Visualization } from '../..';
import { combineQueryAndFilters, getLayerMetaInfo } from '../../app_plugin/show_underlying_data';
import { TableInspectorAdapter } from '../../editor_frame_service/types';

import { Datasource, IndexPatternMap } from '../../types';
import { getMergedSearchContext } from '../expressions/merged_search_context';
import { emptySerializer } from '../helper';
import type {
  GetStateType,
  LensEmbeddableStartServices,
  LensRuntimeState,
  ViewInDiscoverCallbacks,
  ViewUnderlyingDataArgs,
  VisualizationContextHelper,
} from '../types';

function getViewUnderlyingDataArgs({
  activeDatasource,
  activeDatasourceState,
  activeVisualization,
  activeVisualizationState,
  activeData,
  dataViews,
  capabilities,
  query,
  filters,
  timeRange,
  esQueryConfig,
}: {
  activeDatasource: Datasource;
  activeDatasourceState: unknown;
  activeVisualization: Visualization;
  activeVisualizationState: unknown;
  activeData: TableInspectorAdapter | undefined;
  dataViews: IndexPatternMap;
  capabilities: {
    canSaveVisualizations: boolean;
    canOpenVisualizations: boolean;
    canSaveDashboards: boolean;
    navLinks: Capabilities['navLinks'];
    discover: Capabilities['discover'];
  };
  query: ExecutionContextSearch['query'];
  filters: Filter[];
  timeRange: TimeRange;
  esQueryConfig: EsQueryConfig;
}) {
  const { error, meta } = getLayerMetaInfo(
    activeDatasource,
    activeDatasourceState,
    activeVisualization,
    activeVisualizationState,
    activeData,
    dataViews,
    timeRange,
    capabilities
  );

  if (error || !meta) {
    return;
  }
  if (isOfAggregateQueryType(query)) {
    return;
  }
  const luceneOrKuery: Query[] = [];
  const aggregateQuery: AggregateQuery[] = [];

  if (Array.isArray(query)) {
    query.forEach((q) => {
      if (isOfQueryType(q)) {
        luceneOrKuery.push(q);
      } else {
        aggregateQuery.push(q);
      }
    });
  }

  const { filters: newFilters, query: newQuery } = combineQueryAndFilters(
    luceneOrKuery.length > 0 ? luceneOrKuery : (query as Query),
    filters,
    meta,
    Object.values(dataViews),
    esQueryConfig
  );

  const dataViewSpec = dataViews[meta.id]!.spec;

  return {
    dataViewSpec,
    timeRange,
    filters: newFilters,
    query: aggregateQuery.length > 0 ? aggregateQuery[0] : newQuery,
    columns: meta.columns,
  };
}

function computeViewUnderlyingDataArgs(
  state: LensRuntimeState,
  { getVisualizationContext }: VisualizationContextHelper,
  { capabilities, uiSettings, injectFilterReferences, data }: LensEmbeddableStartServices
) {
  const {
    doc,
    activeData,
    activeDatasource,
    activeDatasourceState,
    activeVisualizationState,
    activeVisualization,
    indexPatterns,
  } = getVisualizationContext();
  if (
    !doc ||
    !activeData ||
    !activeDatasource ||
    !activeDatasourceState ||
    !activeVisualization ||
    !activeVisualizationState
  ) {
    return;
  }

  const mergedSearchContext = getMergedSearchContext(
    state,
    {
      filters: state.filters,
      query: state.query,
      timeRange: state.timeRange,
      timeslice: state.timeslice,
    },
    {
      data,
      injectFilterReferences,
    }
  );

  if (!mergedSearchContext.timeRange) {
    return;
  }

  const viewUnderlyingDataArgs = getViewUnderlyingDataArgs({
    activeDatasource,
    activeDatasourceState,
    activeVisualization,
    activeVisualizationState,
    activeData,
    capabilities: {
      canSaveDashboards: Boolean(capabilities.dashboard?.showWriteControls),
      canSaveVisualizations: Boolean(capabilities.visualize.save),
      canOpenVisualizations: Boolean(capabilities.visualize.show),
      navLinks: capabilities.navLinks,
      discover: capabilities.discover,
    },
    query: mergedSearchContext.query,
    filters: mergedSearchContext.filters || [],
    timeRange: mergedSearchContext.timeRange,
    esQueryConfig: getEsQueryConfig(uiSettings),
    dataViews: indexPatterns,
  });

  return viewUnderlyingDataArgs;
}

function createViewUnderlyingDataApis(
  getState: GetStateType,
  visualizationContextHelper: VisualizationContextHelper,
  services: LensEmbeddableStartServices
): ViewInDiscoverCallbacks {
  let viewUnderlyingDataArgs: undefined | ViewUnderlyingDataArgs;

  return {
    canViewUnderlyingData: async () => {
      viewUnderlyingDataArgs = computeViewUnderlyingDataArgs(
        getState(),
        visualizationContextHelper,
        services
      );
      return Boolean(viewUnderlyingDataArgs);
    },
    getViewUnderlyingDataArgs: () => {
      return viewUnderlyingDataArgs;
    },
  };
}

/**
 * Initialize APIs used for actions on Lens panels
 * This includes drilldowns, explore data, and more
 */
export function initializeActionApi(
  uuid: string,
  initialState: LensRuntimeState,
  getLatestState: GetStateType,
  titleApi: { panelTitle: PublishingSubject<string | undefined> },
  visualizationContextHelper: VisualizationContextHelper,
  services: LensEmbeddableStartServices
): {
  api: ViewInDiscoverCallbacks & HasDynamicActions;
  comparators: StateComparators<DynamicActionsSerializedState>;
  serialize: () => {};
  cleanup: () => void;
} {
  const dynamicActionsApi = services.embeddableEnhanced?.initializeReactEmbeddableDynamicActions(
    uuid,
    () => titleApi.panelTitle.getValue(),
    initialState
  );
  const maybeStopDynamicActions = dynamicActionsApi?.startDynamicActions();

  return {
    api: {
      ...(dynamicActionsApi?.dynamicActionsApi ?? {}),
      ...createViewUnderlyingDataApis(getLatestState, visualizationContextHelper, services),
    },
    comparators: {
      ...(dynamicActionsApi?.dynamicActionsComparator ?? {
        enhancements: getUnchangingComparator(),
      }),
    },
    serialize: emptySerializer,
    cleanup: () => {
      maybeStopDynamicActions?.stopDynamicActions();
    },
  };
}
