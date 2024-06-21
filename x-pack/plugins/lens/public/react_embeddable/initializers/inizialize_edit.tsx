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
import React from 'react';
import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { APP_ID, getEditPath } from '../../../common/constants';
import {
  getStateType,
  LensEmbeddableStartServices,
  LensInspectorAdapters,
  LensRuntimeState,
} from '../types';
import { emptySerializer } from '../helper';
import { EditLensConfigurationProps } from '../../app_plugin/shared/edit_on_the_fly/get_edit_lens_configuration';
import { LensPluginStartDependencies } from '../../plugin';
import { getActiveDatasourceIdFromDoc } from '../../utils';
import { TypedLensByValueInput } from '../../embeddable/embeddable_component';

function getSupportedTriggers(
  getState: getStateType,
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
  getState: getStateType,
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
      onEdit: navigateToLensEditor(embeddable.getStateTransfer(), false),
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
      openConfigPanel: async (
        startDependencies: LensPluginStartDependencies,
        isNewPanel?: boolean,
        deletePanel?: () => void
      ): Promise<JSX.Element | null> => {
        const { getEditLensConfiguration } = await import('../../async_services');
        const Component = await getEditLensConfiguration(
          coreStart,
          startDependencies,
          visualizationMap,
          datasourceMap
        );
        const currentState = getState();
        const attributes = currentState.attributes;
        const activeDatasourceId = getActiveDatasourceIdFromDoc(attributes);

        const datasourceId = (activeDatasourceId ||
          'formBased') as EditLensConfigurationProps['datasourceId'];

        if (attributes?.visualizationType == null) {
          return null;
        }
        return (
          <Component
            attributes={attributes as TypedLensByValueInput['attributes']}
            // updatePanelState={this.updateVisualization.bind(this)}
            // updateSuggestion={this.updateSuggestion.bind(this)}
            // updateByRefInput={this.updateByRefInput.bind(this)}
            updateByRefInput={noop}
            updatePanelState={noop}
            updateSuggestion={noop}
            datasourceId={datasourceId}
            lensAdapters={inspectorApi.getInspectorAdapters()}
            output$={new BehaviorSubject({})}
            panelId={uuid}
            savedObjectId={currentState.savedObjectId}
            navigateToLensEditor={
              !isTextBasedLanguage(currentState)
                ? navigateToLensEditor(
                    new EmbeddableStateTransfer(
                      coreStart.application.navigateToApp,
                      coreStart.application.currentAppId$
                    ),
                    true
                  )
                : undefined
            }
            displayFlyoutHeader
            canEditTextBasedQuery={isTextBasedLanguage(currentState)}
            isNewPanel={isNewPanel}
            deletePanel={deletePanel}
          />
        );
      },
    },
  };
}
