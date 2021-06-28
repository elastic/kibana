/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './workspace_panel_wrapper.scss';

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPageContent, EuiFlexGroup, EuiFlexItem, EuiScreenReaderOnly } from '@elastic/eui';
import classNames from 'classnames';
import { Datasource, FramePublicAPI, Visualization } from '../../../types';
import { NativeRenderer } from '../../../native_renderer';
import { Action } from '../state_management';
import { ChartSwitch } from './chart_switch';
import { WarningsPopover } from './warnings_popover';

export interface WorkspacePanelWrapperProps {
  children: React.ReactNode | React.ReactNode[];
  framePublicAPI: FramePublicAPI;
  visualizationState: unknown;
  dispatch: (action: Action) => void;
  title?: string;
  visualizationMap: Record<string, Visualization>;
  visualizationId: string | null;
  datasourceMap: Record<string, Datasource>;
  datasourceStates: Record<
    string,
    {
      isLoading: boolean;
      state: unknown;
    }
  >;
  isFullscreen: boolean;
}

export function WorkspacePanelWrapper({
  children,
  framePublicAPI,
  visualizationState,
  dispatch,
  title,
  visualizationId,
  visualizationMap,
  datasourceMap,
  datasourceStates,
  isFullscreen,
}: WorkspacePanelWrapperProps) {
  const activeVisualization = visualizationId ? visualizationMap[visualizationId] : null;
  const setVisualizationState = useCallback(
    (newState: unknown) => {
      if (!activeVisualization) {
        return;
      }
      dispatch({
        type: 'UPDATE_VISUALIZATION_STATE',
        visualizationId: activeVisualization.id,
        updater: newState,
        clearStagedPreview: false,
      });
    },
    [dispatch, activeVisualization]
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
        ...(datasource.getWarningMessages(datasourceState.state, framePublicAPI) || [])
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
                    visualizationId={visualizationId}
                    visualizationState={visualizationState}
                    datasourceMap={datasourceMap}
                    datasourceStates={datasourceStates}
                    dispatch={dispatch}
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
      >
        <EuiScreenReaderOnly>
          <h1 id="lns_ChartTitle" data-test-subj="lns_ChartTitle">
            {title ||
              i18n.translate('xpack.lens.chartTitle.unsaved', {
                defaultMessage: 'Unsaved visualization',
              })}
          </h1>
        </EuiScreenReaderOnly>
        {children}
      </EuiPageContent>
    </>
  );
}
