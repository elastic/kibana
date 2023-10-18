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
import {
  DatasourceMap,
  FramePublicAPI,
  UserMessagesGetter,
  VisualizationMap,
  Visualization,
  VisualizationDisplayOptions,
} from '../../../types';
import { DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from '../../../utils';
import { ChartSwitch } from './chart_switch';
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
  displayOptions: VisualizationDisplayOptions | undefined;
}

export function VisualizationToolbar(props: {
  activeVisualization: Visualization | null;
  framePublicAPI: FramePublicAPI;
}) {
  const dispatchLens = useLensDispatch();
  const visualization = useLensSelector(selectVisualizationState);
  const { activeVisualization } = props;
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
        <EuiFlexItem grow={false}>
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
  const maxDimensionsPX = displayOptions?.maxDimensionsPX;

  const visDimensionsCSS = aspectRatio
    ? {
        aspectRatio: `${aspectRatio.x}/${aspectRatio.y}`,
        ...(aspectRatio.y > aspectRatio.x
          ? {
              height: '100%',
              width: 'auto',
            }
          : {
              height: 'auto',
              width: '100%',
            }),
      }
    : maxDimensionsPX
    ? {
        maxWidth: maxDimensionsPX && `${maxDimensionsPX.x}px`,
        maxHeight: maxDimensionsPX && `${maxDimensionsPX.y}px`,
        aspectRatio:
          maxDimensionsPX.x && maxDimensionsPX.y && `${maxDimensionsPX.x}/${maxDimensionsPX.y}`,
      }
    : {};

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
                  <EuiFlexItem grow={false}>
                    <ChartSwitch
                      data-test-subj="lnsChartSwitcher"
                      visualizationMap={visualizationMap}
                      datasourceMap={datasourceMap}
                      framePublicAPI={framePublicAPI}
                    />
                  </EuiFlexItem>
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
          css={{ height: '100%' }}
        >
          <EuiFlexItem
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
