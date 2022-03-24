/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './workspace_panel_wrapper.scss';

import React, { useCallback } from 'react';
import { EuiPageContent, EuiFlexGroup, EuiFlexItem, EuiSwitch, EuiButton } from '@elastic/eui';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { Storage } from '../../../../../../../src/plugins/kibana_utils/public';
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
  enableAutoApply,
  disableAutoApply,
  selectAutoApplyEnabled,
} from '../../../state_management';
import { WorkspaceTitle } from './title';
import { DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from '../config_panel/dimension_container';
import { writeToStorage } from '../../../settings_storage';

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

  const toggleAutoApply = useCallback(() => {
    trackUiEvent('toggle_autoapply');

    writeToStorage(
      new Storage(localStorage),
      AUTO_APPLY_DISABLED_STORAGE_KEY,
      String(autoApplyEnabled)
    );
    dispatchLens(autoApplyEnabled ? disableAutoApply() : enableAutoApply());
  }, [dispatchLens, autoApplyEnabled]);

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
          gutterSize="none"
          direction="row"
          responsive={false}
          wrap={true}
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={true}>
            <EuiFlexGroup
              gutterSize="m"
              direction="row"
              responsive={false}
              wrap={true}
              justifyContent="spaceBetween"
              className={classNames('lnsWorkspacePanelWrapper__toolbar', {
                'lnsWorkspacePanelWrapper__toolbar--fullscreen': isFullscreen,
              })}
            >
              {!isFullscreen && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="m" justifyContent="flexStart">
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
              )}
              <EuiFlexItem>
                <EuiFlexGroup
                  alignItems="center"
                  justifyContent="flexStart"
                  gutterSize="s"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiSwitch
                      label={i18n.translate('xpack.lens.editorFrame.autoApply', {
                        defaultMessage: 'Auto-apply',
                      })}
                      checked={autoApplyEnabled}
                      onChange={toggleAutoApply}
                      compressed={true}
                      className={DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS}
                      data-test-subj="lensToggleAutoApply"
                    />
                  </EuiFlexItem>
                  {!autoApplyEnabled && (
                    <EuiFlexItem grow={false}>
                      <div>
                        <EuiButton
                          disabled={autoApplyEnabled || changesApplied}
                          fill
                          className={DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS}
                          iconType="play"
                          onClick={() => dispatchLens(applyChanges())}
                          size="s"
                          data-test-subj="lensApplyChanges"
                        >
                          <FormattedMessage
                            id="xpack.lens.editorFrame.applyChangesLabel"
                            defaultMessage="Apply"
                          />
                        </EuiButton>
                      </div>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
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
