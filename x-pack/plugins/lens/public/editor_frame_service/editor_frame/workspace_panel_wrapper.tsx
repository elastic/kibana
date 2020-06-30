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
import { FramePublicAPI, Visualization } from '../../types';
import { NativeRenderer } from '../../native_renderer';
import { Action } from './state_management';

export interface WorkspacePanelWrapperProps {
  children: React.ReactNode | React.ReactNode[];
  framePublicAPI: FramePublicAPI;
  visualizationState: unknown;
  activeVisualization: Visualization | null;
  dispatch: (action: Action) => void;
  emptyExpression: boolean;
  title?: string;
}

export function WorkspacePanelWrapper({
  children,
  framePublicAPI,
  visualizationState,
  activeVisualization,
  dispatch,
  title,
  emptyExpression,
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
