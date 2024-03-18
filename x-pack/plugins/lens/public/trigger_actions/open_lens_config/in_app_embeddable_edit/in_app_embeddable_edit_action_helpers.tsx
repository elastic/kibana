/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import ReactDOM from 'react-dom';
import type { CoreStart } from '@kbn/core/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { LensPluginStartDependencies } from '../../../plugin';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import { extractReferencesFromState } from '../../../utils';
import type { LensChartLoadEvent } from './types';

export function isEmbeddableEditActionCompatible(
  core: CoreStart,
  attributes: TypedLensByValueInput['attributes']
) {
  // for ES|QL is compatible only when advanced setting is enabled
  const query = attributes.state.query;
  return isOfAggregateQueryType(query) ? core.uiSettings.get('discover:enableESQL') : true;
}

export async function executeEditEmbeddableAction({
  deps,
  core,
  attributes,
  lensEvent,
  container,
  onUpdate,
  onApply,
  onCancel,
}: {
  deps: LensPluginStartDependencies;
  core: CoreStart;
  attributes: TypedLensByValueInput['attributes'];
  lensEvent: LensChartLoadEvent;
  container?: HTMLElement | null;
  onUpdate: (newAttributes: TypedLensByValueInput['attributes']) => void;
  onApply?: (newAttributes: TypedLensByValueInput['attributes']) => void;
  onCancel?: () => void;
}) {
  const isCompatibleAction = isEmbeddableEditActionCompatible(core, attributes);
  if (!isCompatibleAction) {
    throw new IncompatibleActionError();
  }

  const { getEditLensConfiguration, getVisualizationMap, getDatasourceMap } = await import(
    '../../../async_services'
  );
  const visualizationMap = getVisualizationMap();
  const datasourceMap = getDatasourceMap();
  const query = attributes.state.query;
  const activeDatasourceId = isOfAggregateQueryType(query) ? 'textBased' : 'formBased';

  const onUpdatePanelState = (
    datasourceState: unknown,
    visualizationState: unknown,
    visualizationType?: string
  ) => {
    if (attributes.state) {
      const datasourceStates = {
        ...attributes.state.datasourceStates,
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
        activeVisualization: visualizationType ? visualizationMap[visualizationType] : undefined,
      });

      const attrs = {
        ...attributes,
        state: {
          ...attributes.state,
          visualization: visualizationState,
          datasourceStates,
        },
        references,
        visualizationType: visualizationType ?? attributes.visualizationType,
      } as TypedLensByValueInput['attributes'];

      onUpdate(attrs);
    }
  };

  const onUpdateSuggestion = (attrs: TypedLensByValueInput['attributes']) => {
    const newAttributes = {
      ...attributes,
      ...attrs,
    };
    onUpdate(newAttributes);
  };

  const Component = await getEditLensConfiguration(core, deps, visualizationMap, datasourceMap);
  const ConfigPanel = (
    <Component
      attributes={attributes}
      updatePanelState={onUpdatePanelState}
      lensAdapters={lensEvent?.adapters}
      output$={lensEvent?.embeddableOutput$}
      displayFlyoutHeader
      datasourceId={activeDatasourceId}
      onApplyCb={onApply}
      onCancelCb={onCancel}
      canEditTextBasedQuery={activeDatasourceId === 'textBased'}
      updateSuggestion={onUpdateSuggestion}
      hideTimeFilterInfo={true}
    />
  );

  // in case an element is given render the component in the container,
  // otherwise a flyout will open
  if (container) {
    ReactDOM.render(ConfigPanel, container);
  } else {
    const handle = core.overlays.openFlyout(
      toMountPoint(
        React.cloneElement(ConfigPanel, {
          closeFlyout: () => {
            handle.close();
          },
        }),
        {
          theme$: core.theme.theme$,
        }
      ),
      {
        className: 'lnsConfigPanel__overlay',
        size: 's',
        'data-test-subj': 'customizeLens',
        type: 'push',
        paddingSize: 'm',
        hideCloseButton: true,
        onClose: (overlayRef) => {
          overlayRef.close();
        },
        outsideClickCloses: true,
      }
    );
  }
}
