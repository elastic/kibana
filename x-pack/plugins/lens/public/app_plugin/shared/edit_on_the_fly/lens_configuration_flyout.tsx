/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { LensPluginStartDependencies } from '../../../plugin';
import { getResolvedDateRange } from '../../../utils';
import {
  DataViewsState,
  useLensDispatch,
  updateStateFromSuggestion,
} from '../../../state_management';
import { VisualizationToolbar } from '../../../editor_frame_service/editor_frame/workspace_panel';

import type { DatasourceMap, VisualizationMap, DatasourceLayers } from '../../../types';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import { ConfigPanelWrapper } from '../../../editor_frame_service/editor_frame/config_panel/config_panel';

interface EditConfigPanelProps {
  attributes: TypedLensByValueInput['attributes'];
  dataView: DataView;
  updateAll: (datasourceState: unknown, visualizationState: unknown) => void;
  coreStart: CoreStart;
  startDependencies: LensPluginStartDependencies;
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  setIsFlyoutVisible?: (flag: boolean) => void;
  datasourceId: 'formBased' | 'textBased';
}

export function LensEditCongifurationFlyout({
  attributes,
  dataView,
  coreStart,
  startDependencies,
  visualizationMap,
  datasourceMap,
  datasourceId,
  updateAll,
  setIsFlyoutVisible,
}: EditConfigPanelProps) {
  const currentDataViewId = dataView.id ?? '';
  const datasourceState = attributes.state.datasourceStates[datasourceId];
  const activeVisualization = visualizationMap[attributes.visualizationType];
  const activeDatasource = datasourceMap[datasourceId];
  const dispatchLens = useLensDispatch();
  const { euiTheme } = useEuiTheme();
  dispatchLens(
    updateStateFromSuggestion({
      newDatasourceId: datasourceId,
      visualizationId: activeVisualization.id,
      visualizationState: attributes.state.visualization,
      datasourceState,
    })
  );
  const dataViews = useMemo(() => {
    return {
      indexPatterns: {
        [currentDataViewId]: dataView,
      },
      indexPatternRefs: [],
    } as unknown as DataViewsState;
  }, [currentDataViewId, dataView]);

  const dateRange = getResolvedDateRange(startDependencies.data.query.timefilter.timefilter);
  const datasourceLayers: DatasourceLayers = useMemo(() => {
    return {};
  }, []);
  const layers = activeDatasource.getLayers(datasourceState);
  layers.forEach((layer) => {
    datasourceLayers[layer] = datasourceMap[datasourceId].getPublicAPI({
      state: datasourceState,
      layerId: layer,
      indexPatterns: dataViews.indexPatterns,
    });
  });

  const framePublicAPI = useMemo(() => {
    return {
      activeData: {},
      dataViews,
      datasourceLayers,
      dateRange,
    };
  }, [dataViews, dateRange, datasourceLayers]);

  const closeFlyout = () => {
    setIsFlyoutVisible?.(false);
  };

  const layerPanelsProps = {
    framePublicAPI,
    datasourceMap,
    visualizationMap,
    core: coreStart,
    dataViews: startDependencies.dataViews,
    uiActions: startDependencies.uiActions,
    hideLayerHeader: true,
    onUpdateStateCb: updateAll,
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
      hideCloseButton
    >
      <EuiFlyoutBody
        className="lnsEditFlyoutBody"
        css={css`
          .euiFlyoutBody__overflowContent {
            padding: ${euiTheme.size.s};
          }
        `}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="menuRight"
              iconSize="m"
              size="xs"
              onClick={closeFlyout}
              data-test-subj="collapseFlyoutButton"
              aria-controls="lens-config-close-button"
              aria-expanded="true"
              aria-label={i18n.translate('xpack.lens.config.closeFlyoutAriaLabel', {
                defaultMessage: 'Close flyout',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <VisualizationToolbar
              activeVisualization={activeVisualization}
              framePublicAPI={framePublicAPI}
              onUpdateStateCb={updateAll}
            />
            <EuiSpacer size="m" />
            <ConfigPanelWrapper {...layerPanelsProps} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
}
