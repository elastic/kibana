/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import React from 'react';
import type { PublishingSubject } from '@kbn/presentation-publishing';
import { EditLensConfigurationProps } from '../../app_plugin/shared/edit_on_the_fly/get_edit_lens_configuration';
import { EditConfigPanelProps } from '../../app_plugin/shared/edit_on_the_fly/types';
import { getActiveDatasourceIdFromDoc } from '../../utils';
import { isTextBasedLanguage } from '../helper';
import {
  GetStateType,
  LensEmbeddableStartServices,
  LensInspectorAdapters,
  LensRuntimeState,
  TypedLensSerializedState,
} from '../types';
import { PanelManagementApi } from './panel_management';
import { getStateManagementForInlineEditing } from './state_management';

export function prepareInlineEditPanel(
  getState: GetStateType,
  updateState: (newState: LensRuntimeState) => void,
  {
    coreStart,
    ...startDependencies
  }: Omit<
    LensEmbeddableStartServices,
    | 'timefilter'
    | 'coreHttp'
    | 'capabilities'
    | 'expressionRenderer'
    | 'documentToExpression'
    | 'injectFilterReferences'
    | 'visualizationMap'
    | 'datasourceMap'
    | 'theme'
    | 'uiSettings'
    | 'attributeService'
  >,
  dataLoading$: PublishingSubject<boolean | undefined> | undefined,
  panelManagementApi: PanelManagementApi,
  inspectorApi: LensInspectorAdapters,
  navigateToLensEditor?: (
    stateTransfer: EmbeddableStateTransfer,
    skipAppLeave?: boolean
  ) => () => Promise<void>,
  uuid?: string
) {
  return async function openConfigPanel({
    onApply,
    onCancel,
    hideTimeFilterInfo,
  }: Partial<Pick<EditConfigPanelProps, 'onApply' | 'onCancel' | 'hideTimeFilterInfo'>> = {}) {
    const { getEditLensConfiguration, getVisualizationMap, getDatasourceMap } = await import(
      '../../async_services'
    );
    const visualizationMap = getVisualizationMap();
    const datasourceMap = getDatasourceMap();

    const currentState = getState();
    const attributes = currentState.attributes as TypedLensSerializedState['attributes'];
    const activeDatasourceId = (getActiveDatasourceIdFromDoc(attributes) ||
      'formBased') as EditLensConfigurationProps['datasourceId'];

    const { updatePanelState, updateSuggestion } = getStateManagementForInlineEditing(
      activeDatasourceId,
      () => getState().attributes as TypedLensSerializedState['attributes'],
      (attrs: TypedLensSerializedState['attributes'], resetId: boolean = false) => {
        const prevState = getState();
        updateState({
          ...prevState,
          attributes: attrs,
          /**
           * SavedObjectId is undefined for by value panels and defined for the by reference ones.
           * Here we are converting the by reference panels to by value when user is inline editing
           * @TODO: remove this in a follow up PR
           */
          ...(resetId ? { savedObjectId: undefined } : {}),
        });
      },
      visualizationMap,
      datasourceMap,
      startDependencies.data.query.filterManager.extract
    );

    const updateByRefInput = (savedObjectId: LensRuntimeState['savedObjectId']) => {
      updateState({ ...getState(), savedObjectId });
    };
    const Component = await getEditLensConfiguration(
      coreStart,
      startDependencies,
      visualizationMap,
      datasourceMap
    );

    if (attributes?.visualizationType == null) {
      return null;
    }
    return (
      <Component
        attributes={attributes}
        updateByRefInput={updateByRefInput}
        updatePanelState={updatePanelState}
        updateSuggestion={updateSuggestion}
        datasourceId={activeDatasourceId}
        lensAdapters={inspectorApi.getInspectorAdapters()}
        dataLoading$={dataLoading$}
        panelId={uuid}
        savedObjectId={currentState.savedObjectId}
        navigateToLensEditor={
          !isTextBasedLanguage(currentState) && navigateToLensEditor
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
        isNewPanel={panelManagementApi.isNewPanel()}
        onCancel={() => {
          panelManagementApi.onStopEditing(true, undefined);
          onCancel?.();
        }}
        onApply={(newAttributes) => {
          panelManagementApi.onStopEditing(false, { ...getState(), attributes: newAttributes });
          if (newAttributes.visualizationType != null) {
            onApply?.(newAttributes);
          }
        }}
        hideTimeFilterInfo={hideTimeFilterInfo}
      />
    );
  };
}
