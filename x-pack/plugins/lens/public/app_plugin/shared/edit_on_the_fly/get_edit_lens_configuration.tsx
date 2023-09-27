/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlyout, EuiLoadingSpinner, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Provider } from 'react-redux';
import type { MiddlewareAPI, Dispatch, Action } from '@reduxjs/toolkit';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { isEqual } from 'lodash';
import { RootDragDropProvider } from '@kbn/dom-drag-drop';
import type { LensPluginStartDependencies } from '../../../plugin';
import {
  makeConfigureStore,
  LensRootStore,
  loadInitial,
  initExisting,
  initEmpty,
} from '../../../state_management';
import { generateId } from '../../../id_generator';
import type { DatasourceMap, VisualizationMap } from '../../../types';
import {
  LensEditConfigurationFlyout,
  type EditConfigPanelProps,
} from './lens_configuration_flyout';
import { SavedObjectIndexStore, type Document } from '../../../persistence';
import { DOC_TYPE } from '../../../../common/constants';

export type EditLensConfigurationProps = Omit<
  EditConfigPanelProps,
  'startDependencies' | 'coreStart' | 'visualizationMap' | 'datasourceMap' | 'saveByRef'
>;
function LoadingSpinnerWithOverlay() {
  return (
    <EuiOverlayMask>
      <EuiLoadingSpinner />
    </EuiOverlayMask>
  );
}

type UpdaterType = (datasourceState: unknown, visualizationState: unknown) => void;

// exported for testing
export const updatingMiddleware =
  (updater: UpdaterType) => (store: MiddlewareAPI) => (next: Dispatch) => (action: Action) => {
    const {
      datasourceStates: prevDatasourceStates,
      visualization: prevVisualization,
      activeDatasourceId: prevActiveDatasourceId,
    } = store.getState().lens;
    next(action);
    const { datasourceStates, visualization, activeDatasourceId } = store.getState().lens;
    if (
      prevActiveDatasourceId !== activeDatasourceId ||
      !isEqual(
        prevDatasourceStates[prevActiveDatasourceId].state,
        datasourceStates[activeDatasourceId].state
      ) ||
      !isEqual(prevVisualization, visualization)
    ) {
      // ignore the actions that initialize the store with the state from the attributes
      if (initExisting.match(action) || initEmpty.match(action)) {
        return;
      }
      updater(datasourceStates[activeDatasourceId].state, visualization.state);
    }
  };

export async function getEditLensConfiguration(
  coreStart: CoreStart,
  startDependencies: LensPluginStartDependencies,
  visualizationMap?: VisualizationMap,
  datasourceMap?: DatasourceMap
) {
  const { getLensServices, getLensAttributeService } = await import('../../../async_services');
  const lensServices = await getLensServices(
    coreStart,
    startDependencies,
    getLensAttributeService(coreStart, startDependencies)
  );

  return ({
    attributes,
    updatePanelState,
    closeFlyout,
    wrapInFlyout,
    datasourceId,
    panelId,
    savedObjectId,
    output$,
    lensAdapters,
    updateByRefInput,
    navigateToLensEditor,
    displayFlyoutHeader,
  }: EditLensConfigurationProps) => {
    if (!lensServices || !datasourceMap || !visualizationMap) {
      return <LoadingSpinnerWithOverlay />;
    }
    /**
     * During inline editing of a by reference panel, the panel is converted to a by value one.
     * When the user applies the changes we save them to the Lens SO
     */
    const saveByRef = useCallback(
      async (attrs: Document) => {
        const savedObjectStore = new SavedObjectIndexStore(lensServices.contentManagement);
        await savedObjectStore.save({
          ...attrs,
          savedObjectId,
          type: DOC_TYPE,
        });
      },
      [savedObjectId]
    );
    const datasourceState = attributes.state.datasourceStates[datasourceId];
    const storeDeps = {
      lensServices,
      datasourceMap,
      visualizationMap,
      initialContext:
        datasourceState && 'initialContext' in datasourceState
          ? datasourceState.initialContext
          : undefined,
    };
    const lensStore: LensRootStore = makeConfigureStore(
      storeDeps,
      undefined,
      updatingMiddleware(updatePanelState)
    );
    lensStore.dispatch(
      loadInitial({
        initialInput: {
          attributes,
          id: panelId ?? generateId(),
        },
        inlineEditing: true,
      })
    );

    const getWrapper = (children: JSX.Element) => {
      if (wrapInFlyout) {
        return (
          <EuiFlyout
            type="push"
            ownFocus
            onClose={() => {
              closeFlyout?.();
            }}
            aria-labelledby={i18n.translate('xpack.lens.config.editLabel', {
              defaultMessage: 'Edit configuration',
            })}
            size="s"
            hideCloseButton
            css={css`
              clip-path: polygon(-100% 0, 100% 0, 100% 100%, -100% 100%);
            `}
          >
            {children}
          </EuiFlyout>
        );
      } else {
        return children;
      }
    };

    const configPanelProps = {
      attributes,
      updatePanelState,
      closeFlyout,
      datasourceId,
      coreStart,
      startDependencies,
      visualizationMap,
      output$,
      lensAdapters,
      datasourceMap,
      saveByRef,
      savedObjectId,
      updateByRefInput,
      navigateToLensEditor,
      displayFlyoutHeader,
    };

    return getWrapper(
      <Provider store={lensStore}>
        <KibanaContextProvider services={lensServices}>
          <RootDragDropProvider>
            <LensEditConfigurationFlyout {...configPanelProps} />
          </RootDragDropProvider>
        </KibanaContextProvider>
      </Provider>
    );
  };
}
