/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Capabilities,
  CoreStart,
  HttpSetup,
  IUiSettingsClient,
  ThemeServiceStart,
} from '@kbn/core/public';
import { RecursiveReadonly } from '@kbn/utility-types';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { DataPublicPluginStart, FilterManager, TimefilterContract } from '@kbn/data-plugin/public';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import {
  ExpressionRendererParams,
  ReactExpressionRendererType,
} from '@kbn/expressions-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import {
  initializeTimeRange,
  initializeTitles,
  getUnchangingComparator,
  PublishingSubject,
  fetch$,
  apiPublishesUnifiedSearch,
  apiHasAppContext,
  apiHasDisableTriggers,
  apiHasExecutionContext,
  apiPublishesViewMode,
  ViewMode,
} from '@kbn/presentation-publishing';
import React, { useEffect } from 'react';
import { BehaviorSubject, switchMap } from 'rxjs';
import {
  EmbeddableStart,
  ReactEmbeddableFactory,
  ViewMode,
  ViewMode,
} from '@kbn/embeddable-plugin/public';
import { EmbeddableEnhancedPluginStart } from '@kbn/embeddable-enhanced-plugin/public';
import { ExecutionContextSearch, isOfQueryType, TimeRange } from '@kbn/es-query';
// import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import { get, noop } from 'lodash';
import { apiPublishesSearchSession } from '@kbn/presentation-publishing/interfaces/fetch/publishes_search_session';
import { isChartSizeEvent } from '@kbn/chart-expressions-common';
import { apiPublishesSettings } from '@kbn/presentation-containers/interfaces/publishes_settings';
import { VIS_EVENT_TO_TRIGGER } from '@kbn/visualizations-plugin/public';
import { getUiActions } from '@kbn/visualizations-plugin/public/services';
import type { DatasourceMap, VisualizationMap } from '../types';
// import { extract, inject } from '../../common/embeddable_factory';
import type { LensAttributesService } from '../lens_attribute_service';
import type { Document } from '../persistence/saved_object_store';
import { DOC_TYPE, LENS_EMBEDDABLE_TYPE } from '../../common/constants';
import { LensApi, LensSerializedState, LensBasicApi } from './types';
import type { DocumentToExpressionReturnType } from '../editor_frame_service/editor_frame';
// import { ExpressionWrapper } from './expression_wrapper';
import { initializeEditApi } from './inizialize_edit_api';
import { getLensInspectorService } from '../lens_inspector_service';

export interface LensEmbeddableStartServices {
  data: DataPublicPluginStart;
  timefilter: TimefilterContract;
  coreHttp: HttpSetup;
  coreStart: CoreStart;
  inspector: InspectorStart;
  capabilities: RecursiveReadonly<Capabilities>;
  expressionRenderer: ReactExpressionRendererType;
  dataViews: DataViewsContract;
  uiActions?: UiActionsStart;
  usageCollection?: UsageCollectionSetup;
  documentToExpression: (doc: Document) => Promise<DocumentToExpressionReturnType>;
  injectFilterReferences: FilterManager['inject'];
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  spaces?: SpacesPluginStart;
  theme: ThemeServiceStart;
  uiSettings: IUiSettingsClient;
  embeddableEnhanced?: EmbeddableEnhancedPluginStart;
  attributeService: LensAttributesService;
  embeddable: EmbeddableStart;
}

function initializePanelSettings(
  uuid: string,
  state: LensSerializedState,
  embeddableEnhanced?: EmbeddableEnhancedPluginStart
) {
  const title = initializeTitles(state);
  const timeRange = initializeTimeRange(state);
  const defaultPanelTitle$ = new BehaviorSubject<string | undefined>(state.title);

  const actionsConfig = initializeActionApi(uuid, state, title.titlesApi, embeddableEnhanced);

  return {
    api: {
      getTypeDisplayName: () => LENS_EMBEDDABLE_TYPE,
      defaultPanelTitle: defaultPanelTitle$,
      ...timeRange.api,
      ...title.titlesApi,
      ...actionsConfig.api,
    },
    comparators: {
      ...timeRange.comparators,
      ...title.titleComparators,
      ...actionsConfig.comparators,
    },
    attributes: {
      ...timeRange.serialize(),
      ...title.serializeTitles(),
      ...actionsConfig.serialize(),
    },
    cleanup: () => {
      actionsConfig.cleanup();
    },
  };
}

function initializeInspector(services: LensEmbeddableStartServices) {
  return {
    api: getLensInspectorService(services.inspector),
    comparators: {},
    attributes: noop,
    cleanup: noop,
  };
}

function initializeActionApi(
  uuid: string,
  state: LensSerializedState,
  titleApi: { panelTitle: PublishingSubject<string | undefined> },
  embeddableEnhanced?: EmbeddableEnhancedPluginStart
) {
  const dynamicActionsApi = embeddableEnhanced?.initializeReactEmbeddableDynamicActions(
    uuid,
    () => titleApi.panelTitle.getValue(),
    state
  );
  const maybeStopDynamicActions = dynamicActionsApi?.startDynamicActions();

  return {
    api: {
      ...(dynamicActionsApi?.dynamicActionsApi ?? {}),
    },
    comparators: {
      ...(dynamicActionsApi?.dynamicActionsComparator ?? {
        enhancements: getUnchangingComparator(),
      }),
    },
    serialize: () => ({}),
    cleanup: () => {
      maybeStopDynamicActions?.stopDynamicActions();
    },
  };
}

function initializeSearchContext({ data, injectFilterReferences }: LensEmbeddableStartServices) {
  const searchSessionId$ = new BehaviorSubject<string | undefined>('');
  const timeRange$ = new BehaviorSubject<TimeRange | undefined>(undefined);
  // const context: ExecutionContextSearch = {
  //   now: data.nowProvider.get().getTime(),
  //   timeRange:
  //     state.timeslice != null
  //       ? {
  //           from: new Date(state.timeslice[0]).toISOString(),
  //           to: new Date(state.timeslice[1]).toISOString(),
  //           mode: 'absolute' as 'absolute',
  //         }
  //       : state.timeRange,
  //   query: [state.state.query],
  //   filters: injectFilterReferences(state.state.filters, state.references),
  //   disableWarningToasts: true,
  // };
  // merge query and filters
  return {
    api: {
      searchSessionId$,
      timeRange$,
    },
    comparators: {},
    cleanup: noop,
    serialize: () => ({
      searchSessionId: searchSessionId$.getValue(),
      timeRange: timeRange$.getValue(),
    }),
  };
}

export const createLensEmbeddableFactory = (
  services: LensEmbeddableStartServices
): ReactEmbeddableFactory<LensSerializedState, LensApi> => ({
  type: DOC_TYPE,
  deserializeState: async ({ rawState }) => {
    if (rawState.savedObjectId) {
      const { attributes, managed } = await services.attributeService.loadFromLibrary(
        rawState.savedObjectId
      );
      return { ...rawState, attributes, managed };
    }
    return rawState;
  },
  buildEmbeddable: async (state, buildApi, uuid, parentApi) => {
    const { expressionRenderer, embeddableEnhanced, spaces } = services;

    const panelConfig = initializePanelSettings(uuid, state, embeddableEnhanced);
    const editConfig = initializeEditApi(
      uuid,
      getState,
      (currentState: LensSerializedState) => !isOfQueryType(currentState.attributes?.state.query),
      services,
      parentApi,
      state.savedObjectId
    );
    const inspectorConfig = initializeInspector(services);
    const searchContextConfig = initializeSearchContext(services);

    // const expressionParams$ = new BehaviorSubject<ExpressionRendererParams>({
    //   expression: '',
    // });
    // const expressionAbortController$ = new BehaviorSubject<AbortController>(new AbortController());
    // const viewMode$ = apiPublishesViewMode(parentApi)
    //   ? parentApi.viewMode
    //   : new BehaviorSubject(ViewMode.VIEW);

    // const executionContext = apiHasExecutionContext(parentApi)
    //   ? parentApi.executionContext
    //   : undefined;
    // const disableTriggers = apiHasDisableTriggers(parentApi)
    //   ? parentApi.disableTriggers
    //   : undefined;
    // const parentApiContext = apiHasAppContext(parentApi) ? parentApi.getAppContext() : undefined;

    function getState(): LensSerializedState {
      return {
        ...state,
        ...panelConfig.attributes,
        ...editConfig.attributes,
        ...inspectorConfig.attributes,
      };
    }

    const api: LensApi = buildApi(
      {
        ...panelConfig.api,
        ...editConfig.api,
        ...inspectorConfig.api,
        ...searchContextConfig.api,
        serializeState: () => ({ rawState: getState(), references: [] }),
      },
      {
        ...panelConfig.comparators,
        ...editConfig.comparators,
        ...inspectorConfig.comparators,
        ...searchContextConfig.comparators,
        attributes: getUnchangingComparator(),
        savedObjectId: getUnchangingComparator(),
      }
    );

    return {
      api,
      Component: () => {
        useEffect(() => {
          return () => {
            panelConfig.cleanup();
            editConfig.cleanup();
            inspectorConfig.cleanup();
          };
        }, []);

        const currentState = getState();

        try {
          const { ast, indexPatterns, indexPatternRefs, activeVisualizationState } =
            await getExpressionFromDocument(this.savedVis, this.deps.documentToExpression);
        } catch (e) {}

        if (!spaces) {
          return <div>Missing plugin</div>;
        }
        if (!state) {
          return <div>Missing state</div>;
        }

        return (
          <ExpressionWrapper
            ExpressionRenderer={expressionRenderer}
            expression={this.expression || null}
            lensInspector={this.lensInspector}
            searchContext={this.getMergedSearchContext()}
            variables={{
              embeddableTitle: this.getTitle(),
              ...(input.palette ? { theme: { palette: input.palette } } : {}),
              ...('overrides' in input ? { overrides: input.overrides } : {}),
              ...getInternalTables(this.savedVis.state.datasourceStates),
            }}
            searchSessionId={this.getInput().searchSessionId}
            handleEvent={this.handleEvent}
            onData$={this.updateActiveData}
            onRender$={this.onRender}
            interactive={!input.disableTriggers && !this.isTextBasedLanguage()}
            renderMode={input.renderMode}
            syncColors={input.syncColors}
            syncTooltips={input.syncTooltips}
            syncCursor={input.syncCursor}
            hasCompatibleActions={this.hasCompatibleActions}
            getCompatibleCellValueActions={this.getCompatibleCellValueActions}
            className={input.className}
            style={input.style}
            executionContext={this.getExecutionContext()}
            abortController={this.input.abortController}
            addUserMessages={(messages) => this.addUserMessages(messages)}
            onRuntimeError={(error) => {
              this.updateOutput({ error });
              this.logError('runtime');
            }}
            noPadding={this.visDisplayOptions.noPadding}
          />
        );
      },
    };
  },
});
