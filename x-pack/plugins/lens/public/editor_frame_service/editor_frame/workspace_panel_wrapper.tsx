/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiPageContent, EuiPageContentBody, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FramePublicAPI, Visualization } from '../../types';
import { NativeRenderer } from '../../native_renderer';
import { Action } from './state_management';

export interface WorkspacePanelWrapperProps {
  children: React.ReactNode | React.ReactNode[];
  framePublicAPI: FramePublicAPI;
  visualizationState: unknown;
  activeVisualization?: Visualization;
  dispatch: (action: Action) => void;
}

export function WorkspacePanelWrapper({
  children,
  framePublicAPI,
  visualizationState,
  activeVisualization,
  dispatch,
}: WorkspacePanelWrapperProps) {
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
    <EuiFlexGroup gutterSize="s" direction="column" alignItems="stretch">
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
      <EuiFlexItem>
        <EuiPageContent className="lnsWorkspacePanelWrapper">
          <EuiPageContentBody className="lnsWorkspacePanelWrapper__pageContentBody">
            {children}
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
