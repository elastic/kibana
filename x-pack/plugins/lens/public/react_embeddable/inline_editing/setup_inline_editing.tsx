/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { noop } from 'lodash';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { EditLensConfigurationProps } from '../../app_plugin/shared/edit_on_the_fly/get_edit_lens_configuration';
import { TypedLensByValueInput } from '../../embeddable/embeddable_component';
import { LensPluginStartDependencies } from '../../plugin';
import { getActiveDatasourceIdFromDoc } from '../../utils';
import { isTextBasedLanguage } from '../helper';
import { GetStateType, LensEmbeddableStartServices, LensInspectorAdapters } from '../types';

export function prepareInlineEditPanel(
  uuid: string,
  getState: GetStateType,
  {
    visualizationMap,
    datasourceMap,
    coreStart,
  }: Pick<LensEmbeddableStartServices, 'coreStart' | 'visualizationMap' | 'datasourceMap'>,
  inspectorApi: LensInspectorAdapters,
  navigateToLensEditor: (
    stateTransfer: EmbeddableStateTransfer,
    skipAppLeave?: boolean
  ) => () => Promise<void>
) {
  return async function openConfigPanel(
    startDependencies: LensPluginStartDependencies,
    isNewPanel?: boolean,
    deletePanel?: () => void
  ) {
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
  };
}
