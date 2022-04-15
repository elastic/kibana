/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './workspace_panel_wrapper.scss';

import React, { useCallback } from 'react';
import { EuiPageContent, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n-react';
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
  useLensSelector,
  selectChangesApplied,
  applyChanges,
  selectAutoApplyEnabled,
} from '../../../state_management';
import { WorkspaceTitle } from './title';
import { DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from '../config_panel/dimension_container';

export const AUTO_APPLY_DISABLED_STORAGE_KEY = 'autoApplyDisabled';

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

  const changesApplied = useLensSelector(selectChangesApplied);
  const autoApplyEnabled = useLensSelector(selectAutoApplyEnabled);

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
      {!(isFullscreen && (autoApplyEnabled || warningMessages?.length)) && (
        <EuiFlexGroup
          alignItems="flexEnd"
          gutterSize="s"
          direction="row"
          className={classNames('lnsWorkspacePanelWrapper__toolbar', {
            'lnsWorkspacePanelWrapper__toolbar--fullscreen': isFullscreen,
          })}
          responsive={false}
        >
          {!isFullscreen && (
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
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
                      render={activeVisualization.renderToolbar.bind(activeVisualization)}
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
          )}

          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              {warningMessages?.length ? (
                <EuiFlexItem grow={false}>
                  <WarningsPopover>{warningMessages}</WarningsPopover>
                </EuiFlexItem>
              ) : null}

              {!autoApplyEnabled && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    disabled={autoApplyEnabled || changesApplied}
                    fill
                    className={
                      'lnsWorkspacePanelWrapper__applyButton ' +
                      DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS
                    }
                    iconType="checkInCircleFilled"
                    onClick={() => dispatchLens(applyChanges())}
                    size="m"
                    data-test-subj="lnsApplyChanges__toolbar"
                    minWidth="auto"
                  >
                    <FormattedMessage
                      id="xpack.lens.editorFrame.applyChangesLabel"
                      defaultMessage="Apply changes"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

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
