/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { EditLensConfigurationProps } from '../../app_plugin/shared/edit_on_the_fly/get_edit_lens_configuration';
// import { LensPluginStartDependencies } from '../../plugin';
import {
  extractReferencesFromState,
  getActiveDatasourceIdFromDoc,
  getActiveVisualizationIdFromDoc,
} from '../../utils';
import { isTextBasedLanguage } from '../helper';
import {
  GetStateType,
  LensEmbeddableStartServices,
  LensInspectorAdapters,
  LensRuntimeState,
} from '../types';

export function prepareInlineEditPanel(
  uuid: string,
  getState: GetStateType,
  updateState: (newState: LensRuntimeState) => void,
  { visualizationMap, datasourceMap, coreStart, ...startDependencies }: LensEmbeddableStartServices,
  inspectorApi: LensInspectorAdapters,
  navigateToLensEditor: (
    stateTransfer: EmbeddableStateTransfer,
    skipAppLeave?: boolean
  ) => () => Promise<void>,
  renderComplete$: BehaviorSubject<boolean>
) {
  const updateVisualization = (
    datasourceState: unknown,
    visualizationState: unknown,
    visualizationType?: string
  ) => {
    const currentState = getState();
    const viz = currentState.attributes;
    const activeDatasourceId = (getActiveDatasourceIdFromDoc(viz) ??
      'formBased') as EditLensConfigurationProps['datasourceId'];

    const activeVisualizationId = getActiveVisualizationIdFromDoc(viz);
    if (viz?.state) {
      const datasourceStates = {
        ...viz.state.datasourceStates,
        [activeDatasourceId]: datasourceState,
      };
      const references = extractReferencesFromState({
        activeDatasources: Object.keys(datasourceStates).reduce(
          (acc, datasourceId) => ({
            ...acc,
            [datasourceId]: datasourceMap[datasourceId],
          }),
          {}
        ),
        datasourceStates: Object.fromEntries(
          Object.entries(datasourceStates).map(([id, state]) => [id, { isLoading: false, state }])
        ),
        visualizationState,
        activeVisualization: activeVisualizationId
          ? visualizationMap[visualizationType ?? activeVisualizationId]
          : undefined,
      });
      const attrs = {
        ...viz,
        state: {
          ...viz.state,
          visualization: visualizationState,
          datasourceStates,
        },
        references,
        visualizationType: visualizationType ?? viz.visualizationType,
      };

      /**
       * SavedObjectId is undefined for by value panels and defined for the by reference ones.
       * Here we are converting the by reference panels to by value when user is inline editing
       */
      updateState({ ...currentState, attributes: attrs, savedObjectId: undefined });
    }
  };

  const updateSuggestion = (attrs: LensRuntimeState['attributes']) => {
    updateState({ ...getState(), attributes: attrs });
  };

  const updateByRefInput = (savedObjectId: LensRuntimeState['savedObjectId']) => {
    updateState({ ...getState(), savedObjectId });
  };

  return async function openConfigPanel(isNewPanel?: boolean, deletePanel?: () => void) {
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
        attributes={attributes}
        updateByRefInput={updateByRefInput}
        updatePanelState={updateVisualization}
        updateSuggestion={updateSuggestion}
        datasourceId={datasourceId}
        lensAdapters={inspectorApi.getInspectorAdapters()}
        renderComplete$={renderComplete$}
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
  };
}
