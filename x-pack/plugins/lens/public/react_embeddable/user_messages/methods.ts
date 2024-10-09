/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpacesApi } from '@kbn/spaces-plugin/public';
import {
  filterAndSortUserMessages,
  getApplicationUserMessages,
  handleMessageOverwriteFromConsumer,
} from '../../app_plugin/get_application_user_messages';
import { getDatasourceLayers } from '../../state_management/utils';
import {
  UserMessagesGetter,
  AddUserMessages,
  UserMessage,
  FramePublicAPI,
  SharingSavedObjectProps,
} from '../../types';
import {
  getActiveDatasourceIdFromDoc,
  getActiveVisualizationIdFromDoc,
  getInitialDataViewsObject,
} from '../../utils';
import {
  LensPublicCallbacks,
  LensEmbeddableStartServices,
  VisualizationContext,
  VisualizationContextHelper,
} from '../types';
import { getLegacyURLConflictsMessage, hasLegacyURLConflict } from './checks';

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
  { coreStart, visualizationMap, datasourceMap }: LensEmbeddableStartServices,
  onBeforeBadgesRender: LensPublicCallbacks['onBeforeBadgesRender'],
  spaces?: SpacesApi,
  metaInfo?: SharingSavedObjectProps
): {
  getUserMessages: UserMessagesGetter;
  addUserMessages: AddUserMessages;
  resetRuntimeMessages: () => void;
} {
  let runtimeUserMessages: Record<string, UserMessage> = {};

  return {
    resetRuntimeMessages: () => {
      runtimeUserMessages = {};
    },
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

      if (hasLegacyURLConflict(metaInfo, spaces)) {
        // @TODO: fix this TS type issue as a follow-up
        userMessages.push(getLegacyURLConflictsMessage(metaInfo!, spaces!));
      }

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

      return handleMessageOverwriteFromConsumer(
        filterAndSortUserMessages(
          userMessages.concat(Object.values(runtimeUserMessages)),
          locationId,
          filters ?? {}
        ),
        onBeforeBadgesRender
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

      return () => {
        messages.forEach(({ uniqueId }) => {
          delete runtimeUserMessages[uniqueId];
        });
      };
    },
  };
}
