/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './workspace_panel_wrapper.scss';

import React, { useCallback } from 'react';
import { EuiPageTemplate, EuiFlexGroup, EuiFlexItem, EuiButton } from '@elastic/eui';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n-react';
import { ChartSizeSpec } from '@kbn/chart-expressions-common';
import { ChartSizeUnit } from '@kbn/chart-expressions-common/types';
import { Interpolation, Theme, css } from '@emotion/react';
import {
  DatasourceMap,
  FramePublicAPI,
  UserMessagesGetter,
  VisualizationMap,
  Visualization,
} from '../../../types';
import { DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from '../../../utils';
import { MessageList } from './message_list';
import {
  useLensDispatch,
  updateVisualizationState,
  DatasourceStates,
  useLensSelector,
  selectChangesApplied,
  applyChanges,
  selectAutoApplyEnabled,
  selectVisualizationState,
} from '../../../state_management';
import { LensInspector } from '../../../lens_inspector_service';
import { WorkspaceTitle } from './title';

export const AUTO_APPLY_DISABLED_STORAGE_KEY = 'autoApplyDisabled';

export interface WorkspacePanelWrapperProps {
  children: React.ReactNode | React.ReactNode[];
  framePublicAPI: FramePublicAPI;
  visualizationMap: VisualizationMap;
  visualizationId: string | null;
  datasourceMap: DatasourceMap;
  datasourceStates: DatasourceStates;
  isFullscreen: boolean;
  lensInspector: LensInspector;
  getUserMessages: UserMessagesGetter;
  displayOptions: ChartSizeSpec | undefined;
}

const unitToCSSUnit: Record<ChartSizeUnit, string> = {
  pixels: 'px',
  percentage: '%',
};

const getAspectRatioStyles = ({ x, y }: { x: number; y: number }) => {
  return {
    aspectRatio: `${x}/${y}`,
    ...(y > x
      ? {
          height: '100%',
          width: 'auto',
        }
      : {
          height: 'auto',
          width: '100%',
        }),
  };
};

export function VisualizationToolbar(props: {
  activeVisualization: Visualization | null;
  framePublicAPI: FramePublicAPI;
  isFixedPosition?: boolean;
}) {
  const dispatchLens = useLensDispatch();
  const visualization = useLensSelector(selectVisualizationState);
  const { activeVisualization, isFixedPosition } = props;
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

  const ToolbarComponent = props.activeVisualization?.ToolbarComponent;

  return (
    <>
      {ToolbarComponent && (
        <EuiFlexItem
          grow={false}
          className={classNames({
            'lnsVisualizationToolbar--fixed': isFixedPosition,
          })}
        >
          {ToolbarComponent({
            frame: props.framePublicAPI,
            state: visualization.state,
            setState: setVisualizationState,
          })}
        </EuiFlexItem>
      )}
    </>
  );
}

export function WorkspacePanelWrapper({
  children,
  framePublicAPI,
  visualizationId,
  visualizationMap,
  datasourceMap,
  isFullscreen,
  getUserMessages,
  displayOptions,
}: WorkspacePanelWrapperProps) {
  const dispatchLens = useLensDispatch();

  const changesApplied = useLensSelector(selectChangesApplied);
  const autoApplyEnabled = useLensSelector(selectAutoApplyEnabled);

  const activeVisualization = visualizationId ? visualizationMap[visualizationId] : null;
  const userMessages = getUserMessages('toolbar');

  const aspectRatio = displayOptions?.aspectRatio;
  const maxDimensions = displayOptions?.maxDimensions;
  const minDimensions = displayOptions?.minDimensions;

  let visDimensionsCSS: Interpolation<Theme> = {};

  if (aspectRatio) {
    visDimensionsCSS = getAspectRatioStyles(aspectRatio ?? maxDimensions);
  }

  if (maxDimensions) {
    visDimensionsCSS.maxWidth = maxDimensions.x
      ? `${maxDimensions.x.value}${unitToCSSUnit[maxDimensions.x.unit]}`
      : '';
    visDimensionsCSS.maxHeight = maxDimensions.y
      ? `${maxDimensions.y.value}${unitToCSSUnit[maxDimensions.y.unit]}`
      : '';
  }

  if (minDimensions) {
    visDimensionsCSS.minWidth = minDimensions.x
      ? `${minDimensions.x.value}${unitToCSSUnit[minDimensions.x.unit]}`
      : '';
    visDimensionsCSS.minHeight = minDimensions.y
      ? `${minDimensions.y.value}${unitToCSSUnit[minDimensions.y.unit]}`
      : '';
  }

  return (
    <EuiPageTemplate
      direction="column"
      offset={0}
      minHeight={0}
      restrictWidth={false}
      mainProps={{ component: 'div' } as unknown as {}}
    >
      {!(isFullscreen && (autoApplyEnabled || userMessages?.length)) && (
        <EuiPageTemplate.Section
          paddingSize="none"
          color="transparent"
          className="hide-for-sharing"
        >
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
                  <VisualizationToolbar
                    activeVisualization={activeVisualization}
                    framePublicAPI={framePublicAPI}
                  />
                </EuiFlexGroup>
              </EuiFlexItem>
            )}

            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                {userMessages?.length ? (
                  <EuiFlexItem grow={false}>
                    <MessageList messages={userMessages} />
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
        </EuiPageTemplate.Section>
      )}

      <EuiPageTemplate.Section
        grow={true}
        paddingSize="none"
        contentProps={{
          className: 'lnsWorkspacePanelWrapper__content',
        }}
        className={classNames('lnsWorkspacePanelWrapper stretch-for-sharing', {
          'lnsWorkspacePanelWrapper--fullscreen': isFullscreen,
        })}
        css={{ height: '100%' }}
        color="transparent"
      >
        <EuiFlexGroup
          gutterSize="none"
          alignItems="center"
          justifyContent="center"
          direction="column"
          css={css`
            height: 100%;
          `}
        >
          <EuiFlexItem
            data-test-subj="lnsWorkspacePanelWrapper__innerContent"
            grow={false}
            css={{
              flexGrow: 0,
              height: '100%',
              width: '100%',
              ...visDimensionsCSS,
            }}
          >
            <WorkspaceTitle />
            {children}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
