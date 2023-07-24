/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlyout, EuiLoadingSpinner, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Provider } from 'react-redux';
import { PreloadedState } from '@reduxjs/toolkit';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { LensPluginStartDependencies } from '../../../plugin';
import {
  makeConfigureStore,
  LensRootStore,
  LensAppState,
  LensState,
  loadInitial,
} from '../../../state_management';
import { getPreloadedState } from '../../../state_management/lens_slice';
import { generateId } from '../../../id_generator';
import type { DatasourceMap, VisualizationMap } from '../../../types';
import {
  LensEditConfigurationFlyout,
  type EditConfigPanelProps,
} from './lens_configuration_flyout';
import type { LensAppServices } from '../../types';

export type EditLensConfigurationProps = Omit<
  EditConfigPanelProps,
  'startDependencies' | 'coreStart' | 'visualizationMap' | 'datasourceMap'
>;

function LoadingSpinnerWithOverlay() {
  return (
    <EuiOverlayMask>
      <EuiLoadingSpinner />
    </EuiOverlayMask>
  );
}

export function getEditLensConfiguration(
  coreStart: CoreStart,
  startDependencies: LensPluginStartDependencies,
  visualizationMap?: VisualizationMap,
  datasourceMap?: DatasourceMap
) {
  return ({
    attributes,
    dataView,
    updateAll,
    closeFlyout,
    wrapInFlyout,
    datasourceId,
    adaptersTables,
    panelId,
    canEditTextBasedQuery,
  }: EditLensConfigurationProps) => {
    const [lensServices, setLensServices] = useState<LensAppServices>();
    useEffect(() => {
      async function loadLensService() {
        const { getLensServices, getLensAttributeService } = await import(
          '../../../async_services'
        );
        const lensServicesT = await getLensServices(
          coreStart,
          startDependencies,
          getLensAttributeService(coreStart, startDependencies)
        );

        setLensServices(lensServicesT);
      }
      loadLensService();
    }, []);

    if (!lensServices || !datasourceMap || !visualizationMap || !dataView.id) {
      return <LoadingSpinnerWithOverlay />;
    }
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
    const lensStore: LensRootStore = makeConfigureStore(storeDeps, {
      lens: getPreloadedState(storeDeps) as LensAppState,
    } as unknown as PreloadedState<LensState>);
    lensStore.dispatch(
      loadInitial({
        initialInput: {
          attributes,
          id: panelId ?? generateId(),
        },
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
            aria-labelledby={i18n.translate('xpack.lens.config.editConfigurationLabel', {
              defaultMessage: 'Edit configuration',
            })}
            size="s"
            hideCloseButton
            css={css`
              background: none;
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
      dataView,
      updateAll,
      closeFlyout,
      datasourceId,
      adaptersTables,
      coreStart,
      startDependencies,
      visualizationMap,
      datasourceMap,
      canEditTextBasedQuery,
    };

    return getWrapper(
      <Provider store={lensStore}>
        <KibanaContextProvider services={lensServices}>
          <LensEditConfigurationFlyout {...configPanelProps} />
        </KibanaContextProvider>
      </Provider>
    );
  };
}
