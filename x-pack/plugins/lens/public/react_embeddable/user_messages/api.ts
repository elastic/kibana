/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SpacesApi } from '@kbn/spaces-plugin/public';
import { Adapters } from '@kbn/inspector-plugin/common';
import { BehaviorSubject } from 'rxjs';
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
  LensApi,
  LensInternalApi,
} from '../types';
import { getLegacyURLConflictsMessage, hasLegacyURLConflict } from './checks';
import { getSearchWarningMessages } from '../../utils';
import { addLog } from '../logger';

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
  {
    activeDatasource,
    activeDatasourceId,
    activeDatasourceState,
  }: ReturnType<typeof getUpdatedState>,
  adapters: Adapters,
  data: LensEmbeddableStartServices['data']
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
  updateBlockingErrors: (blockingMessages: UserMessage[] | Error) => void;
  updateValidationErrors: (messages: UserMessage[]) => void;
} {
  let runtimeUserMessages: Record<string, UserMessage> = {};
  const addUserMessages = (messages: UserMessage[]) => {
    if (messages.length) {
      addLog(`addUserMessages: "${messages.map(({ uniqueId }) => uniqueId).join('", "')}"`);
    }
    for (const message of messages) {
      runtimeUserMessages[message.uniqueId] = message;
    }
  };

  const resetMessages = () => {
    runtimeUserMessages = {};
    internalApi.resetAllMessages();
  };

  const getUserMessages: UserMessagesGetter = (locationId, filters) => {
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
  };

  return {
    addUserMessages,
    resetMessages,
    getUserMessages,
    /**
     * Here pass all the messages that comes directly from the Lens validation/info system
     * who includes:
     * * configuration errors (i.e. missing fields)
     * * warning messages (badge related)
     * * info messages (badge related)
     */
    updateMessages: (messages: UserMessage[]) => {
      // update the messages only if something changed
      const existingMessages = new Set(
        internalApi.messages$.getValue().map(({ uniqueId }) => uniqueId)
      );
      if (
        existingMessages.size !== messages.length ||
        messages.some(({ uniqueId }) => !existingMessages.has(uniqueId))
      ) {
        internalApi.updateMessages(messages);
      }
    },
    updateValidationErrors: (messages: UserMessage[]) => {
      addLog(
        `Validation error: ${
          messages.length ? messages.map(({ uniqueId }) => uniqueId).join(', ') : 'No errors'
        }`
      );
      internalApi.updateValidationMessages(messages);
    },
    /**
     * This type of errors are those who need to be rendered in the embeddable native error panel
     * like runtime errors.
     */
    updateBlockingErrors: (blockingMessages: UserMessage[] | Error) => {
      const error =
        blockingMessages instanceof Error
          ? blockingMessages
          : blockingMessages.length
          ? new Error(
              typeof blockingMessages[0].longMessage === 'string' && blockingMessages[0].longMessage
                ? blockingMessages[0].longMessage
                : blockingMessages[0].shortMessage
            )
          : undefined;

      if (error) {
        addLog(`Blocking error: ${error?.message}`);
      }

      if (error?.message !== api.blockingError.getValue()?.message) {
        const finalError = error?.message === '' ? undefined : error;
        (api.blockingError as BehaviorSubject<Error | undefined>).next(finalError);
      }
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
