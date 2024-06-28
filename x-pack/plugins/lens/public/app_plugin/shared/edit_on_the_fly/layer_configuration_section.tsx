/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { VisualizationToolbar } from '../../../editor_frame_service/editor_frame/workspace_panel';
import { ConfigPanelWrapper } from '../../../editor_frame_service/editor_frame/config_panel/config_panel';
import { createIndexPatternService } from '../../../data_views_service/service';
import { useLensDispatch, updateIndexPatterns } from '../../../state_management';
import { replaceIndexpattern } from '../../../state_management/lens_slice';
import type { LayerConfigurationProps } from './types';
import { useLensSelector } from '../../../state_management';

export function LayerConfiguration({
  attributes,
  coreStart,
  startDependencies,
  visualizationMap,
  datasourceMap,
  datasourceId,
  framePublicAPI,
  hasPadding,
  setIsInlineFlyoutVisible,
  getUserMessages,
  onlyAllowSwitchToSubtypes,
}: LayerConfigurationProps) {
  const dispatch = useLensDispatch();
  const { euiTheme } = useEuiTheme();
  const { visualization } = useLensSelector((state) => state.lens);
  const activeVisualization =
    visualizationMap[visualization.activeId ?? attributes.visualizationType];
  const indexPatternService = useMemo(
    () =>
      createIndexPatternService({
        dataViews: startDependencies.dataViews,
        uiActions: startDependencies.uiActions,
        core: coreStart,
        updateIndexPatterns: (newIndexPatternsState, options) => {
          dispatch(updateIndexPatterns(newIndexPatternsState));
        },
        replaceIndexPattern: (newIndexPattern, oldId, options) => {
          dispatch(replaceIndexpattern({ newIndexPattern, oldId }));
        },
      }),
    [coreStart, dispatch, startDependencies.dataViews, startDependencies.uiActions]
  );

  const layerPanelsProps = {
    framePublicAPI,
    datasourceMap,
    visualizationMap,
    core: coreStart,
    dataViews: startDependencies.dataViews,
    uiActions: startDependencies.uiActions,
    hideLayerHeader: datasourceId === 'textBased',
    // TODO: remove this prop once we display the chart switch in Discover
    onlyAllowSwitchToSubtypes,
    indexPatternService,
    setIsInlineFlyoutVisible,
    getUserMessages,
  };
  return (
    <div
      css={css`
        padding: ${hasPadding ? euiTheme.size.s : 0};
      `}
    >
      <EuiSpacer size="xs" />
      <VisualizationToolbar
        activeVisualization={activeVisualization}
        framePublicAPI={framePublicAPI}
      />
      <EuiSpacer size="m" />
      <ConfigPanelWrapper {...layerPanelsProps} />
    </div>
  );
}
