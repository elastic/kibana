/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IUiSettingsClient, SavedObjectReference } from '@kbn/core/public';
import { Ast } from '@kbn/interpreter';
import memoizeOne from 'memoize-one';
import { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { difference } from 'lodash';
import type { DataViewsContract, DataViewSpec } from '@kbn/data-views-plugin/public';
import { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { DataViewPersistableStateService } from '@kbn/data-views-plugin/common';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import {
  Datasource,
  DatasourceLayers,
  DatasourceMap,
  IndexPattern,
  IndexPatternMap,
  IndexPatternRef,
  InitializationOptions,
  VisualizationMap,
  VisualizeEditorContext,
} from '../../types';
import { buildExpression } from './expression_helpers';
import { Document } from '../../persistence/saved_object_store';
import { getActiveDatasourceIdFromDoc, sortDataViewRefs } from '../../utils';
import type { DatasourceStates, DataViewsState, VisualizationState } from '../../state_management';
import { readFromStorage } from '../../settings_storage';
import { loadIndexPatternRefs, loadIndexPatterns } from '../../data_views_service/loader';

function getIndexPatterns(
  references?: SavedObjectReference[],
  initialContext?: VisualizeFieldContext | VisualizeEditorContext,
  initialId?: string,
  adHocDataviews?: string[]
) {
  const indexPatternIds = [];
  if (initialContext) {
    if ('isVisualizeAction' in initialContext) {
      indexPatternIds.push(...initialContext.indexPatternIds);
    } else {
      indexPatternIds.push(initialContext.dataViewSpec.id!);
    }
  } else {
    // use the initialId only when no context is passed over
    if (initialId) {
      indexPatternIds.push(initialId);
    }
  }
  if (references) {
    for (const reference of references) {
      if (reference.type === 'index-pattern') {
        indexPatternIds.push(reference.id);
      }
    }
  }
  if (adHocDataviews) {
    indexPatternIds.push(...adHocDataviews);
  }
  return [...new Set(indexPatternIds)];
}

const getLastUsedIndexPatternId = (
  storage: IStorageWrapper,
  indexPatternRefs: IndexPatternRef[]
) => {
  const indexPattern = readFromStorage(storage, 'indexPatternId');
  return indexPattern && indexPatternRefs.find((i) => i.id === indexPattern)?.id;
};

const getRefsForAdHocDataViewsFromContext = (
  indexPatternRefs: IndexPatternRef[],
  usedIndexPatternsIds: string[],
  indexPatterns: Record<string, IndexPattern>
) => {
  const indexPatternIds = indexPatternRefs.map(({ id }) => id);
  const adHocDataViewsIds = usedIndexPatternsIds.filter((id) => !indexPatternIds.includes(id));

  const adHocDataViewsList = Object.values(indexPatterns).filter(({ id }) =>
    adHocDataViewsIds.includes(id)
  );
  return adHocDataViewsList.map(({ id, title, name }) => ({ id, title, name }));
};

export async function initializeDataViews(
  {
    dataViews,
    datasourceMap,
    datasourceStates,
    storage,
    defaultIndexPatternId,
    references,
    initialContext,
    adHocDataViews: persistedAdHocDataViews,
  }: {
    dataViews: DataViewsContract;
    datasourceMap: DatasourceMap;
    datasourceStates: DatasourceStates;
    defaultIndexPatternId: string;
    storage: IStorageWrapper;
    references?: SavedObjectReference[];
    initialContext?: VisualizeFieldContext | VisualizeEditorContext;
    adHocDataViews?: Record<string, DataViewSpec>;
  },
  options?: InitializationOptions
) {
  const adHocDataViews = Object.fromEntries(
    Object.entries(persistedAdHocDataViews || {}).map(([id, persistedSpec]) => {
      const spec = DataViewPersistableStateService.inject(persistedSpec, references || []);
      return [id, spec];
    })
  );
  const { isFullEditor } = options ?? {};

  // make it explicit or TS will infer never[] and break few lines down
  const indexPatternRefs: IndexPatternRef[] = await (isFullEditor
    ? loadIndexPatternRefs(dataViews)
    : []);

  // if no state is available, use the fallbackId
  const lastUsedIndexPatternId = getLastUsedIndexPatternId(storage, indexPatternRefs);
  const fallbackId = lastUsedIndexPatternId || defaultIndexPatternId || indexPatternRefs[0]?.id;
  const initialId =
    !initialContext &&
    Object.keys(datasourceMap).every((datasourceId) => !datasourceStates[datasourceId]?.state)
      ? fallbackId
      : undefined;

  const adHocDataviewsIds: string[] = Object.keys(adHocDataViews || {});

  const usedIndexPatternsIds = getIndexPatterns(
    references,
    initialContext,
    initialId,
    adHocDataviewsIds
  );

  // load them
  const availableIndexPatterns = new Set(indexPatternRefs.map(({ id }: IndexPatternRef) => id));

  const notUsedPatterns: string[] = difference([...availableIndexPatterns], usedIndexPatternsIds);

  const indexPatterns = await loadIndexPatterns({
    dataViews,
    patterns: usedIndexPatternsIds,
    notUsedPatterns,
    cache: {},
    adHocDataViews,
  });

  const adHocDataViewsRefs = getRefsForAdHocDataViewsFromContext(
    indexPatternRefs,
    usedIndexPatternsIds,
    indexPatterns
  );
  return {
    indexPatternRefs: sortDataViewRefs([...indexPatternRefs, ...adHocDataViewsRefs]),
    indexPatterns,
  };
}

/**
 * This function composes both initializeDataViews & initializeDatasources into a single call
 */
export async function initializeSources(
  {
    dataViews,
    datasourceMap,
    visualizationMap,
    visualizationState,
    datasourceStates,
    storage,
    defaultIndexPatternId,
    references,
    initialContext,
    adHocDataViews,
  }: {
    dataViews: DataViewsContract;
    datasourceMap: DatasourceMap;
    visualizationMap: VisualizationMap;
    visualizationState: VisualizationState;
    datasourceStates: DatasourceStates;
    defaultIndexPatternId: string;
    storage: IStorageWrapper;
    references?: SavedObjectReference[];
    initialContext?: VisualizeFieldContext | VisualizeEditorContext;
    adHocDataViews?: Record<string, DataViewSpec>;
  },
  options?: InitializationOptions
) {
  const { indexPatternRefs, indexPatterns } = await initializeDataViews(
    {
      datasourceMap,
      datasourceStates,
      initialContext,
      dataViews,
      storage,
      defaultIndexPatternId,
      references,
      adHocDataViews,
    },
    options
  );
  return {
    indexPatterns,
    indexPatternRefs,
    datasourceStates: initializeDatasources({
      datasourceMap,
      datasourceStates,
      initialContext,
      indexPatternRefs,
      indexPatterns,
      references,
    }),
    visualizationState: initializeVisualization({
      visualizationMap,
      visualizationState,
      references,
      initialContext,
    }),
  };
}

export function initializeVisualization({
  visualizationMap,
  visualizationState,
  references,
  initialContext,
}: {
  visualizationState: VisualizationState;
  visualizationMap: VisualizationMap;
  references?: SavedObjectReference[];
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
}) {
  if (visualizationState?.activeId) {
    return (
      visualizationMap[visualizationState.activeId]?.fromPersistableState?.(
        visualizationState.state,
        references,
        initialContext
      ) ?? visualizationState.state
    );
  }
  return visualizationState.state;
}

export function initializeDatasources({
  datasourceMap,
  datasourceStates,
  indexPatternRefs,
  indexPatterns,
  references,
  initialContext,
}: {
  datasourceMap: DatasourceMap;
  datasourceStates: DatasourceStates;
  indexPatterns: Record<string, IndexPattern>;
  indexPatternRefs: IndexPatternRef[];
  references?: SavedObjectReference[];
  initialContext?: VisualizeFieldContext | VisualizeEditorContext;
}) {
  // init datasources
  const states: DatasourceStates = {};
  for (const [datasourceId, datasource] of Object.entries(datasourceMap)) {
    if (datasourceStates[datasourceId]) {
      const state = datasource.initialize(
        datasourceStates[datasourceId].state || undefined,
        references,
        initialContext,
        indexPatternRefs,
        indexPatterns
      );
      states[datasourceId] = { isLoading: false, state };
    }
  }
  return states;
}

export const getDatasourceLayers = memoizeOne(function getDatasourceLayers(
  datasourceStates: DatasourceStates,
  datasourceMap: DatasourceMap,
  indexPatterns: DataViewsState['indexPatterns']
) {
  const datasourceLayers: DatasourceLayers = {};
  Object.keys(datasourceMap)
    .filter((id) => datasourceStates[id] && !datasourceStates[id].isLoading)
    .forEach((id) => {
      const datasourceState = datasourceStates[id].state;
      const datasource = datasourceMap[id];

      const layers = datasource.getLayers(datasourceState);
      layers.forEach((layer) => {
        datasourceLayers[layer] = datasourceMap[id].getPublicAPI({
          state: datasourceState,
          layerId: layer,
          indexPatterns,
        });
      });
    });
  return datasourceLayers;
});

export async function persistedStateToExpression(
  datasourceMap: DatasourceMap,
  visualizations: VisualizationMap,
  doc: Document,
  services: {
    uiSettings: IUiSettingsClient;
    storage: IStorageWrapper;
    dataViews: DataViewsContract;
    timefilter: TimefilterContract;
  }
): Promise<{
  ast: Ast | null;
  indexPatterns: IndexPatternMap;
  indexPatternRefs: IndexPatternRef[];
}> {
  const {
    state: {
      visualization: persistedVisualizationState,
      datasourceStates: persistedDatasourceStates,
      adHocDataViews,
      internalReferences,
    },
    visualizationType,
    references,
    title,
    description,
  } = doc;
  if (!visualizationType) {
    return { ast: null, indexPatterns: {}, indexPatternRefs: [] };
  }
  const visualization = visualizations[visualizationType!];
  const visualizationState = initializeVisualization({
    visualizationMap: visualizations,
    visualizationState: {
      state: persistedVisualizationState,
      activeId: visualizationType,
    },
    references: [...references, ...(internalReferences || [])],
  });
  const datasourceStatesFromSO = Object.fromEntries(
    Object.entries(persistedDatasourceStates).map(([id, state]) => [
      id,
      { isLoading: false, state },
    ])
  );
  const { indexPatterns, indexPatternRefs } = await initializeDataViews(
    {
      datasourceMap,
      datasourceStates: datasourceStatesFromSO,
      references,
      dataViews: services.dataViews,
      storage: services.storage,
      defaultIndexPatternId: services.uiSettings.get('defaultIndex'),
      adHocDataViews,
    },
    { isFullEditor: false }
  );
  const datasourceStates = initializeDatasources({
    datasourceMap,
    datasourceStates: datasourceStatesFromSO,
    references: [...references, ...(internalReferences || [])],
    indexPatterns,
    indexPatternRefs,
  });

  const datasourceLayers = getDatasourceLayers(datasourceStates, datasourceMap, indexPatterns);

  const datasourceId = getActiveDatasourceIdFromDoc(doc);
  if (datasourceId == null) {
    return {
      ast: null,
      indexPatterns,
      indexPatternRefs,
    };
  }

  const currentTimeRange = services.timefilter.getAbsoluteTime();

  return {
    ast: buildExpression({
      title,
      description,
      visualization,
      visualizationState,
      datasourceMap,
      datasourceStates,
      datasourceLayers,
      indexPatterns,
      dateRange: { fromDate: currentTimeRange.from, toDate: currentTimeRange.to },
    }),
    indexPatterns,
    indexPatternRefs,
  };
}

export function getMissingIndexPattern(
  currentDatasource: Datasource | null,
  currentDatasourceState: { state: unknown } | null,
  indexPatterns: IndexPatternMap
) {
  if (currentDatasourceState?.state == null || currentDatasource == null) {
    return [];
  }
  const missingIds = currentDatasource.checkIntegrity(currentDatasourceState.state, indexPatterns);
  if (!missingIds.length) {
    return [];
  }
  return missingIds;
}
