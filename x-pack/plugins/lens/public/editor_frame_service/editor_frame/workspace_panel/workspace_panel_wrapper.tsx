/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './workspace_panel_wrapper.scss';

import React, { useCallback } from 'react';
import { EuiPageContent, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import classNames from 'classnames';
import { DatasourceMap, FramePublicAPI, VisualizationMap } from '../../../types';
import { NativeRenderer } from '../../../native_renderer';
import { ChartSwitch } from './chart_switch';
import { WarningsPopover } from './warnings_popover';
import {
  useLensDispatch,
  updateVisualizationState,
  DatasourceStates,
  VisualizationState,
  updateDatasourceState,
} from '../../../state_management';
import { WorkspaceTitle } from './title';

export interface WorkspacePanelWrapperProps {
  children: React.ReactNode | React.ReactNode[];
  framePublicAPI: FramePublicAPI;
  visualizationState: VisualizationState['state'];
  visualizationMap: VisualizationMap;
  visualizationId: string | null;
  datasourceMap: DatasourceMap;
  datasourceStates: DatasourceStates;
  isFullscreen: boolean;
}

export function WorkspacePanelWrapper({
  children,
  framePublicAPI,
  visualizationState,
  visualizationId,
  visualizationMap,
  datasourceMap,
  datasourceStates,
  isFullscreen,
}: WorkspacePanelWrapperProps) {
  const dispatchLens = useLensDispatch();

  const activeVisualization = visualizationId ? visualizationMap[visualizationId] : null;
  const setVisualizationState = useCallback(
    (newState: unknown) => {
      if (!activeVisualization) {
        return;
      }
      dispatchLens(
        updateVisualizationState({
          visualizationId: activeVisualization.id,
          newState,
        })
      );
    },
    [dispatchLens, activeVisualization]
  );
  const setDatasourceState = useCallback(
    (updater: unknown, datasourceId: string) => {
      dispatchLens(
        updateDatasourceState({
          updater,
          datasourceId,
        })
      );
    },
    [dispatchLens]
  );
  const warningMessages: React.ReactNode[] = [];
  if (activeVisualization?.getWarningMessages) {
    warningMessages.push(
      ...(activeVisualization.getWarningMessages(visualizationState, framePublicAPI) || [])
    );
  }
  Object.entries(datasourceStates).forEach(([datasourceId, datasourceState]) => {
    const datasource = datasourceMap[datasourceId];
    if (!datasourceState.isLoading && datasource.getWarningMessages) {
      warningMessages.push(
        ...(datasource.getWarningMessages(datasourceState.state, framePublicAPI, (updater) =>
          setDatasourceState(updater, datasourceId)
        ) || [])
      );
    }
  });
  return (
    <>
      <div>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="m"
          direction="row"
          responsive={false}
          wrap={true}
          justifyContent="spaceBetween"
        >
          {!isFullscreen ? (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                gutterSize="m"
                direction="row"
                responsive={false}
                wrap={true}
                className="lnsWorkspacePanelWrapper__toolbar"
              >
                <EuiFlexItem grow={false}>
                  <ChartSwitch
                    data-test-subj="lnsChartSwitcher"
                    visualizationMap={visualizationMap}
                    datasourceMap={datasourceMap}
                    framePublicAPI={framePublicAPI}
                  />
                </EuiFlexItem>
                {activeVisualization && activeVisualization.renderToolbar && (
                  <EuiFlexItem grow={false}>
                    <NativeRenderer
                      render={activeVisualization.renderToolbar}
                      nativeProps={{
                        frame: framePublicAPI,
                        state: visualizationState,
                        setState: setVisualizationState,
                      }}
                    />
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            {warningMessages && warningMessages.length ? (
              <WarningsPopover>{warningMessages}</WarningsPopover>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>

      <EuiPageContent
        className={classNames('lnsWorkspacePanelWrapper', {
          'lnsWorkspacePanelWrapper--fullscreen': isFullscreen,
        })}
        color="transparent"
        hasBorder={false}
        hasShadow={false}
        paddingSize="none"
      >
        <WorkspaceTitle />
        {children}
      </EuiPageContent>
    </>
  );
}
