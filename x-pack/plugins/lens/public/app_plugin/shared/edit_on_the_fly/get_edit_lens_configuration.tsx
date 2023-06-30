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
import type { CoreStart } from '@kbn/core/public';
import type { LensPluginStartDependencies } from '../../../plugin';
import {
  makeConfigureStore,
  LensRootStore,
  LensAppState,
  LensState,
} from '../../../state_management';
import { getPreloadedState } from '../../../state_management/lens_slice';

import type { DatasourceMap, VisualizationMap } from '../../../types';
import {
  LensEditConfifurationFlyout,
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
    setIsFlyoutVisible,
    datasourceId,
    adaptersTables,
  }: EditLensConfigurationProps) => {
    console.dir(attributes);
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
      initialContext: datasourceState && 'initialContext' in datasourceState ? datasourceState.initialContext : undefined,
    };
    const lensStore: LensRootStore = makeConfigureStore(storeDeps, {
      lens: getPreloadedState(storeDeps) as LensAppState,
    } as unknown as PreloadedState<LensState>);
    const closeFlyout = () => {
      setIsFlyoutVisible?.(false);
    };

    const configPanelProps = {
      attributes,
      dataView,
      updateAll,
      setIsFlyoutVisible,
      datasourceId,
      adaptersTables,
      coreStart,
      startDependencies,
      visualizationMap,
      datasourceMap,
    };

    return (
      <EuiFlyout
        type="push"
        ownFocus
        onClose={closeFlyout}
        aria-labelledby={i18n.translate('xpack.lens.config.editLabel', {
          defaultMessage: 'Edit configuration',
        })}
        size="s"
      >
        <Provider store={lensStore}>
          <LensEditConfifurationFlyout {...configPanelProps} />
        </Provider>
      </EuiFlyout>
    );
  };
}
