/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  filterAndSortUserMessages,
  getApplicationUserMessages,
} from '../../app_plugin/get_application_user_messages';
import { getDatasourceLayers } from '../../state_management/utils';
import { UserMessagesGetter, AddUserMessages, UserMessage, FramePublicAPI } from '../../types';
import {
  getActiveDatasourceIdFromDoc,
  getActiveVisualizationIdFromDoc,
  getInitialDataViewsObject,
} from '../../utils';
import {
  LensEmbeddableStartServices,
  VisualizationContext,
  VisualizationContextHelper,
} from '../types';

function getUpdatedState(
  getVisualizationContext: VisualizationContextHelper['getVisualizationContext'],
  visualizationMap: LensEmbeddableStartServices['visualizationMap'],
  datasourceMap: LensEmbeddableStartServices['datasourceMap']
) {
  const {
    doc,
    mergedSearchContext,
    indexPatterns,
    indexPatternRefs,
    activeVisualizationState,
    activeDatasourceState,
    activeData,
  } = getVisualizationContext();
  const activeVisualizationId = getActiveVisualizationIdFromDoc(doc);
  const activeDatasourceId = getActiveDatasourceIdFromDoc(doc);
  const activeDatasource = activeDatasourceId ? datasourceMap[activeDatasourceId] : null;
  const activeVisualization = activeVisualizationId
    ? visualizationMap[activeVisualizationId]
    : undefined;
  const dataViewObject = getInitialDataViewsObject(indexPatterns, indexPatternRefs);
  return {
    doc,
    mergedSearchContext,
    activeDatasource,
    activeVisualization,
    activeVisualizationId,
    dataViewObject,
    activeVisualizationState,
    activeDatasourceState,
    activeDatasourceId,
    activeData,
  };
}

export function buildUserMessagesHelper(
  getVisualizationContext: () => VisualizationContext,
  { coreStart, visualizationMap, datasourceMap }: LensEmbeddableStartServices
): {
  getUserMessages: UserMessagesGetter;
  addUserMessages: AddUserMessages;
} {
  let runtimeUserMessages: Record<string, UserMessage> = {};

  return {
    getUserMessages: (locationId, filters) => {
      const {
        doc,
        activeVisualizationState,
        activeVisualization,
        activeVisualizationId,
        activeDatasource,
        activeDatasourceState,
        activeDatasourceId,
        dataViewObject,
        mergedSearchContext,
        activeData,
      } = getUpdatedState(getVisualizationContext, visualizationMap, datasourceMap);
      if (!activeVisualizationState || !activeDatasourceState) {
        return [];
      }
      const userMessages: UserMessage[] = [];
      userMessages.push(
        ...getApplicationUserMessages({
          visualizationType: doc?.visualizationType,
          visualizationState: {
            state: activeVisualizationState,
            activeId: activeVisualizationId,
          },
          visualization: activeVisualization,
          activeDatasource,
          activeDatasourceState: {
            isLoading: !activeDatasourceState,
            state: activeDatasourceState,
          },
          dataViews: dataViewObject,
          core: coreStart,
        })
      );

      if (!doc) {
        return userMessages;
      }

      const framePublicAPI: FramePublicAPI = {
        dataViews: dataViewObject,
        datasourceLayers: getDatasourceLayers(
          {
            [activeDatasourceId!]: {
              isLoading: !activeDatasourceState,
              state: activeDatasourceState,
            },
          },
          datasourceMap,
          dataViewObject.indexPatterns
        ),
        query: doc.state.query,
        filters: mergedSearchContext.filters ?? [],
        dateRange: {
          fromDate: mergedSearchContext.timeRange?.from ?? '',
          toDate: mergedSearchContext.timeRange?.to ?? '',
        },
        absDateRange: {
          fromDate: mergedSearchContext.timeRange?.from ?? '',
          toDate: mergedSearchContext.timeRange?.to ?? '',
        },
        activeData,
      };

      userMessages.push(
        ...(activeDatasource?.getUserMessages(activeDatasourceState, {
          setState: () => {},
          frame: framePublicAPI,
          visualizationInfo: activeVisualization?.getVisualizationInfo?.(
            activeVisualizationState,
            framePublicAPI
          ),
        }) ?? []),
        ...(activeVisualization?.getUserMessages?.(activeVisualizationState, {
          frame: framePublicAPI,
        }) ?? [])
      );

      return filterAndSortUserMessages(
        userMessages.concat(Object.values(runtimeUserMessages)),
        locationId,
        filters ?? {}
      );
    },
    addUserMessages: (messages) => {
      const newMessageMap: Record<string, UserMessage> = {
        ...runtimeUserMessages,
      };

      const addedMessageIds: string[] = [];
      messages.forEach((message) => {
        if (!newMessageMap[message.uniqueId]) {
          addedMessageIds.push(message.uniqueId);
          newMessageMap[message.uniqueId] = message;
        }
      });

      if (addedMessageIds.length) {
        runtimeUserMessages = newMessageMap;
      }

      return {
        rerender: Boolean(addedMessageIds.length),
        cleanup: () => {
          messages.forEach(({ uniqueId }) => {
            delete runtimeUserMessages[uniqueId];
          });
        },
      };
    },
  };
}
