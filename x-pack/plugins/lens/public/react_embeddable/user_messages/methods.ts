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
import { getSearchWarningMessages } from '../../utils';

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

function getWarningMessages(
  { activeDatasource, activeDatasourceId, activeDatasourceState },
  adapters,
  data
) {
  if (!activeDatasource || !activeDatasourceId || !adapters?.requests) {
    return [];
  }

  const requestWarnings = getSearchWarningMessages(
    adapters.requests,
    activeDatasource,
    activeDatasourceState,
    {
      searchService: data.search,
    }
  );

  return requestWarnings;
}

export function buildUserMessagesHelpers(
  api: LensApi,
  internalApi: LensInternalApi,
  getVisualizationContext: () => VisualizationContext,
  { coreStart, data, visualizationMap, datasourceMap }: LensEmbeddableStartServices,
  onBeforeBadgesRender: LensPublicCallbacks['onBeforeBadgesRender'],
  spaces?: SpacesApi,
  metaInfo?: SharingSavedObjectProps
): {
  getUserMessages: UserMessagesGetter;
  addUserMessages: (messages: UserMessage[]) => void;
  updateWarnings: () => void;
  updateMessages: (messages: UserMessage[]) => void;
  resetMessages: () => void;
  updateBlockingErrors: (blockingMessages: UserMessage[]) => void;
} {
  let runtimeUserMessages: Record<string, UserMessage> = {};
  const addUserMessages = (messages: UserMessage[]) => {
    for (const message of messages) {
      runtimeUserMessages[message.uniqueId] = message;
    }
    internalApi.updateMessages(internalApi.messages$.getValue().concat(messages));
  };

  const resetMessages = () => {
    runtimeUserMessages = {};
    internalApi.resetAllMessages();
  };

  return {
    addUserMessages,
    resetMessages,
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

      if (!doc || !activeDatasourceState || !activeVisualizationState) {
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
    updateMessages: (messages: UserMessage[]) => {
      internalApi.updateMessages(messages);
    },
    updateBlockingErrors: (blockingMessages: UserMessage[]) => {
      api.blockingError.next(
        blockingMessages.length
          ? new Error(
              typeof blockingMessages[0].longMessage === 'string'
                ? blockingMessages[0].longMessage
                : blockingMessages[0].shortMessage
            )
          : undefined
      );
      internalApi.updateBlockingMessages(blockingMessages);
    },
    updateWarnings: () => {
      addUserMessages(
        getWarningMessages(
          getUpdatedState(getVisualizationContext, visualizationMap, datasourceMap),
          api.adapters$.getValue(),
          data
        )
      );
    },
  };
}
