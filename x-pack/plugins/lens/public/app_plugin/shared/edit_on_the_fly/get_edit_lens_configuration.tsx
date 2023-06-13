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
import type { DataView } from '@kbn/data-views-plugin/public';
import type { LensPluginStartDependencies } from '../../../plugin';
import {
  makeConfigureStore,
  LensRootStore,
  LensAppState,
  LensState,
} from '../../../state_management';
import { getPreloadedState } from '../../../state_management/lens_slice';

import type { DatasourceMap, VisualizationMap } from '../../../types';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import { LensEditCongifurationFlyout } from './lens_configuration_flyout';
import type { LensAppServices } from '../../types';

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
  return (props: {
    attributes: TypedLensByValueInput['attributes'];
    dataView: DataView;
    updateAll: (datasourceState: unknown, visualizationState: unknown) => void;
    setIsFlyoutVisible?: (flag: boolean) => void;
    datasourceId: 'formBased' | 'textBased';
  }) => {
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

    if (!lensServices || !datasourceMap || !visualizationMap || !props.dataView.id) {
      return <LoadingSpinnerWithOverlay />;
    }
    const storeDeps = {
      lensServices,
      datasourceMap,
      visualizationMap,
    };
    const lensStore: LensRootStore = makeConfigureStore(storeDeps, {
      lens: getPreloadedState(storeDeps) as LensAppState,
    } as unknown as PreloadedState<LensState>);
    const closeFlyout = () => {
      props.setIsFlyoutVisible?.(false);
    };

    const configPanelProps = {
      ...props,
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
          <LensEditCongifurationFlyout {...configPanelProps} />
        </Provider>
      </EuiFlyout>
    );
  };
}
