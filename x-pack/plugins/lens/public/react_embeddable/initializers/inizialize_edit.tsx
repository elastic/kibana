/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiHasAppContext, apiPublishesViewMode, ViewMode } from '@kbn/presentation-publishing';
import { ENABLE_ESQL } from '@kbn/esql-utils';
import { noop } from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { APP_ID, getEditPath } from '../../../common/constants';
import {
  GetStateType,
  LensEmbeddableStartServices,
  LensInspectorAdapters,
  LensRuntimeState,
} from '../types';
import { emptySerializer } from '../helper';
import { prepareInlineEditPanel } from '../inline_editing/setup_inline_editing';

function getSupportedTriggers(
  getState: GetStateType,
  visualizationMap: LensEmbeddableStartServices['visualizationMap']
) {
  return () => {
    const currentState = getState();
    if (currentState.attributes?.visualizationType) {
      return visualizationMap[currentState.attributes.visualizationType]?.triggers || [];
    }
    return [];
  };
}

/**
 * Initialize the edit API for the embeddable
 * Note: this has also the side effect to update the viewMode$ if parent publishes it
 **/
export function initializeEditApi(
  uuid: string,
  getState: GetStateType,
  isTextBasedLanguage: (currentState: LensRuntimeState) => boolean,
  viewMode$: BehaviorSubject<ViewMode | undefined>,
  {
    data,
    embeddable,
    capabilities,
    uiSettings,
    visualizationMap,
    datasourceMap,
    coreStart,
  }: LensEmbeddableStartServices,
  inspectorApi: LensInspectorAdapters,
  parentApi?: unknown,
  savedObjectId?: string
) {
  const supportedTriggers = getSupportedTriggers(getState, visualizationMap);
  if (!parentApi || !apiHasAppContext(parentApi)) {
    return {
      api: { supportedTriggers, openConfigPanel: async () => null },
      comparators: {},
      serialize: emptySerializer,
      cleanup: noop,
    };
  }

  // update view mode if necessary
  if (apiPublishesViewMode(parentApi)) {
    viewMode$.next(parentApi.viewMode.getValue());
  }

  const navigateToLensEditor =
    (stateTransfer: EmbeddableStateTransfer, skipAppLeave?: boolean) => async () => {
      const parentApiContext = parentApi.getAppContext();
      await stateTransfer.navigateToEditor(APP_ID, {
        path: getEditPath(savedObjectId),
        state: {
          embeddableId: uuid,
          valueInput: getState(),
          originatingApp: parentApiContext.currentAppId ?? 'dashboards',
          originatingPath: parentApiContext.getCurrentPath?.(),
          // searchSessionId: api.searchSessionId,
        },
        skipAppLeave,
      });
    };
  return {
    comparators: {},
    serialize: emptySerializer,
    cleanup: noop,
    api: {
      supportedTriggers,
      onEdit: () => navigateToLensEditor(embeddable.getStateTransfer(), false)(),
      isEditingEnabled: () => {
        if (viewMode$.getValue() !== 'edit') {
          return false;
        }
        // if ESQL check one it is in TextBased mode &&
        if (isTextBasedLanguage(getState()) && !uiSettings.get(ENABLE_ESQL)) {
          return false;
        }
        return (
          Boolean(capabilities.visualize.save) ||
          (!getState().savedObjectId &&
            Boolean(capabilities.dashboard?.showWriteControls) &&
            Boolean(capabilities.visualize.show))
        );
      },
      getEditHref: async () => {
        const currentState = getState();
        return getEditPath(
          savedObjectId,
          currentState.timeRange,
          currentState.filters,
          data.query.timefilter.timefilter.getRefreshInterval()
        );
      },
      openConfigPanel: prepareInlineEditPanel(
        uuid,
        getState,
        { visualizationMap, datasourceMap, coreStart },
        inspectorApi,
        navigateToLensEditor
      ),
    },
  };
}
