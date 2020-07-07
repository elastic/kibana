/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import {
  EuiPageContent,
  EuiPageContentBody,
  EuiPageContentHeader,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { Datasource, FramePublicAPI, Visualization } from '../../../types';
import { NativeRenderer } from '../../../native_renderer';
import { Action } from '../state_management';
import { ChartSwitch } from './chart_switch';

export interface WorkspacePanelWrapperProps {
  children: React.ReactNode | React.ReactNode[];
  framePublicAPI: FramePublicAPI;
  visualizationState: unknown;
  dispatch: (action: Action) => void;
  emptyExpression: boolean;
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
}

export function WorkspacePanelWrapper({
  children,
  framePublicAPI,
  visualizationState,
  dispatch,
  title,
  emptyExpression,
  visualizationId,
  visualizationMap,
  datasourceMap,
  datasourceStates,
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
        newState,
        clearStagedPreview: false,
      });
    },
    [dispatch]
  );
  return (
    <EuiFlexGroup gutterSize="s" direction="column" alignItems="stretch" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" direction="row" responsive={false}>
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
            <EuiFlexItem grow>
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
      <EuiFlexItem>
        <EuiPageContent className="lnsWorkspacePanelWrapper">
          {(!emptyExpression || title) && (
            <EuiPageContentHeader
              className={classNames('lnsWorkspacePanelWrapper__pageContentHeader', {
                'lnsWorkspacePanelWrapper__pageContentHeader--unsaved': !title,
              })}
            >
              <span data-test-subj="lns_ChartTitle">
                {title ||
                  i18n.translate('xpack.lens.chartTitle.unsaved', { defaultMessage: 'Unsaved' })}
              </span>
            </EuiPageContentHeader>
          )}
          <EuiPageContentBody className="lnsWorkspacePanelWrapper__pageContentBody">
            {children}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
