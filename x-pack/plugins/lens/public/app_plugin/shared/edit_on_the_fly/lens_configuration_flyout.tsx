/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { getResolvedDateRange } from '../../../utils';
import type { LensPluginStartDependencies } from '../../../plugin';
import {
  DataViewsState,
  useLensDispatch,
  updateStateFromSuggestion,
} from '../../../state_management';
import { VisualizationToolbar } from '../../../editor_frame_service/editor_frame/workspace_panel';

import type { DatasourceMap, VisualizationMap, DatasourceLayers } from '../../../types';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import { ConfigPanelWrapper } from '../../../editor_frame_service/editor_frame/config_panel/config_panel';

export interface EditConfigPanelProps {
  attributes: TypedLensByValueInput['attributes'];
  dataView: DataView;
  updateAll: (datasourceState: unknown, visualizationState: unknown) => void;
  coreStart: CoreStart;
  startDependencies: LensPluginStartDependencies;
  visualizationMap: VisualizationMap;
  datasourceMap: DatasourceMap;
  closeFlyout?: () => void;
  wrapInFlyout?: boolean;
  datasourceId: 'formBased' | 'textBased';
  adaptersTables?: Record<string, Datatable>;
}

export function LensEditConfigurationFlyout({
  attributes,
  dataView,
  coreStart,
  startDependencies,
  visualizationMap,
  datasourceMap,
  datasourceId,
  updateAll,
  closeFlyout,
  adaptersTables,
}: EditConfigPanelProps) {
  const currentDataViewId = dataView.id ?? '';
  const datasourceState = attributes.state.datasourceStates[datasourceId];
  const activeVisualization = visualizationMap[attributes.visualizationType];
  const activeDatasource = datasourceMap[datasourceId];
  const dispatchLens = useLensDispatch();
  const { euiTheme } = useEuiTheme();
  const dataViews = useMemo(() => {
    return {
      indexPatterns: {
        [currentDataViewId]: dataView,
      },
      indexPatternRefs: [],
    } as unknown as DataViewsState;
  }, [currentDataViewId, dataView]);
  dispatchLens(
    updateStateFromSuggestion({
      newDatasourceId: datasourceId,
      visualizationId: activeVisualization.id,
      visualizationState: attributes.state.visualization,
      datasourceState,
      dataViews,
    })
  );

  const datasourceLayers: DatasourceLayers = useMemo(() => {
    return {};
  }, []);
  const activeData: Record<string, Datatable> = useMemo(() => {
    return {};
  }, []);
  const layers = activeDatasource.getLayers(datasourceState);
  layers.forEach((layer) => {
    datasourceLayers[layer] = datasourceMap[datasourceId].getPublicAPI({
      state: datasourceState,
      layerId: layer,
      indexPatterns: dataViews.indexPatterns,
    });
    if (adaptersTables) {
      activeData[layer] = Object.values(adaptersTables)[0];
    }
  });

  const dateRange = getResolvedDateRange(startDependencies.data.query.timefilter.timefilter);
  const framePublicAPI = useMemo(() => {
    return {
      activeData,
      dataViews,
      datasourceLayers,
      dateRange,
    };
  }, [activeData, dataViews, datasourceLayers, dateRange]);

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
    <>
      <EuiFlyoutBody
        className="lnsEditFlyoutBody"
        css={css`
          .euiFlyoutBody__overflowContent {
            padding: ${euiTheme.size.s};
          }
        `}
      >
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiCallOut
              size="s"
              title={i18n.translate('xpack.lens.config.configFlyoutCallout', {
                defaultMessage: 'SQL currently offers limited configuration options',
              })}
              iconType="iInCircle"
            />
            <EuiSpacer size="m" />
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
      <EuiFlyoutFooter>
        <EuiButtonEmpty
          onClick={closeFlyout}
          data-test-subj="collapseFlyoutButton"
          aria-controls="lens-config-close-button"
          aria-expanded="true"
          aria-label={i18n.translate('xpack.lens.config.closeFlyoutAriaLabel', {
            defaultMessage: 'Close flyout',
          })}
        >
          <FormattedMessage id="xpack.lens.config.closeFlyoutLabel" defaultMessage="Close" />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </>
  );
}
