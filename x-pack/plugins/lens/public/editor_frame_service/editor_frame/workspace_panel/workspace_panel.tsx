/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiImage,
  EuiText,
  EuiButtonEmpty,
  EuiLink,
} from '@elastic/eui';
import { CoreStart, CoreSetup } from 'kibana/public';
import { ExecutionContextSearch } from 'src/plugins/expressions';
import {
  ExpressionRendererEvent,
  ReactExpressionRendererType,
} from '../../../../../../../src/plugins/expressions/public';
import { Action } from '../state_management';
import {
  Datasource,
  Visualization,
  FramePublicAPI,
  isLensBrushEvent,
  isLensFilterEvent,
} from '../../../types';
import { DragDrop, DragContext } from '../../../drag_drop';
import { getSuggestions, switchToSuggestion } from '../suggestion_helpers';
import { buildExpression } from '../expression_helpers';
import { debouncedComponent } from '../../../debounced_component';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import { UiActionsStart } from '../../../../../../../src/plugins/ui_actions/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../../../src/plugins/visualizations/public';
import { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import { WorkspacePanelWrapper } from './workspace_panel_wrapper';

export interface WorkspacePanelProps {
  activeVisualizationId: string | null;
  visualizationMap: Record<string, Visualization>;
  visualizationState: unknown;
  activeDatasourceId: string | null;
  datasourceMap: Record<string, Datasource>;
  datasourceStates: Record<
    string,
    {
      state: unknown;
      isLoading: boolean;
    }
  >;
  framePublicAPI: FramePublicAPI;
  dispatch: (action: Action) => void;
  ExpressionRenderer: ReactExpressionRendererType;
  core: CoreStart | CoreSetup;
  plugins: { uiActions?: UiActionsStart; data: DataPublicPluginStart };
  title?: string;
}

export const WorkspacePanel = debouncedComponent(InnerWorkspacePanel);

// Exported for testing purposes only.
export function InnerWorkspacePanel({
  activeDatasourceId,
  activeVisualizationId,
  visualizationMap,
  visualizationState,
  datasourceMap,
  datasourceStates,
  framePublicAPI,
  dispatch,
  core,
  plugins,
  ExpressionRenderer: ExpressionRendererComponent,
  title,
}: WorkspacePanelProps) {
  const IS_DARK_THEME = core.uiSettings.get('theme:darkMode');
  const emptyStateGraphicURL = IS_DARK_THEME
    ? '/plugins/lens/assets/lens_app_graphic_dark_2x.png'
    : '/plugins/lens/assets/lens_app_graphic_light_2x.png';

  const dragDropContext = useContext(DragContext);

  const suggestionForDraggedField = useMemo(
    () => {
      if (!dragDropContext.dragging || !activeDatasourceId) {
        return;
      }

      const hasData = Object.values(framePublicAPI.datasourceLayers).some(
        (datasource) => datasource.getTableSpec().length > 0
      );

      const suggestions = getSuggestions({
        datasourceMap: { [activeDatasourceId]: datasourceMap[activeDatasourceId] },
        datasourceStates,
        visualizationMap:
          hasData && activeVisualizationId
            ? { [activeVisualizationId]: visualizationMap[activeVisualizationId] }
            : visualizationMap,
        activeVisualizationId,
        visualizationState,
        field: dragDropContext.dragging,
      });

      return suggestions.find((s) => s.visualizationId === activeVisualizationId) || suggestions[0];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragDropContext.dragging]
  );

  const [localState, setLocalState] = useState({
    expressionBuildError: undefined as string | undefined,
    expandError: false,
  });

  const activeVisualization = activeVisualizationId
    ? visualizationMap[activeVisualizationId]
    : null;
  const expression = useMemo(
    () => {
      try {
        return buildExpression({
          visualization: activeVisualization,
          visualizationState,
          datasourceMap,
          datasourceStates,
          datasourceLayers: framePublicAPI.datasourceLayers,
        });
      } catch (e) {
        // Most likely an error in the expression provided by a datasource or visualization
        setLocalState((s) => ({ ...s, expressionBuildError: e.toString() }));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      activeVisualization,
      visualizationState,
      datasourceMap,
      datasourceStates,
      framePublicAPI.dateRange,
      framePublicAPI.query,
      framePublicAPI.filters,
    ]
  );

  const onEvent = useCallback(
    (event: ExpressionRendererEvent) => {
      if (!plugins.uiActions) {
        // ui actions not available, not handling event...
        return;
      }
      if (isLensBrushEvent(event)) {
        plugins.uiActions.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
          data: event.data,
        });
      }
      if (isLensFilterEvent(event)) {
        plugins.uiActions.getTrigger(VIS_EVENT_TO_TRIGGER[event.name]).exec({
          data: event.data,
        });
      }
    },
    [plugins.uiActions]
  );

  const autoRefreshFetch$ = useMemo(
    () => plugins.data.query.timefilter.timefilter.getAutoRefreshFetch$(),
    [plugins.data.query.timefilter.timefilter]
  );

  const context: ExecutionContextSearch = useMemo(
    () => ({
      query: framePublicAPI.query,
      timeRange: {
        from: framePublicAPI.dateRange.fromDate,
        to: framePublicAPI.dateRange.toDate,
      },
      filters: framePublicAPI.filters,
    }),
    [
      framePublicAPI.query,
      framePublicAPI.dateRange.fromDate,
      framePublicAPI.dateRange.toDate,
      framePublicAPI.filters,
    ]
  );

  useEffect(() => {
    // reset expression error if component attempts to run it again
    if (expression && localState.expressionBuildError) {
      setLocalState((s) => ({
        ...s,
        expressionBuildError: undefined,
      }));
    }
  }, [expression, localState.expressionBuildError]);

  function onDrop() {
    if (suggestionForDraggedField) {
      trackUiEvent('drop_onto_workspace');
      trackUiEvent(expression ? 'drop_non_empty' : 'drop_empty');
      switchToSuggestion(dispatch, suggestionForDraggedField, 'SWITCH_VISUALIZATION');
    }
  }

  function renderEmptyWorkspace() {
    return (
      <div className="eui-textCenter">
        <EuiText textAlign="center" grow={false} color="subdued" data-test-subj="empty-workspace">
          <h3>
            <FormattedMessage
              id="xpack.lens.editorFrame.emptyWorkspace"
              defaultMessage="Drop some fields here to start"
            />
          </h3>
          <EuiImage
            style={{ width: 360 }}
            url={core.http.basePath.prepend(emptyStateGraphicURL)}
            alt=""
          />
          <p>
            <FormattedMessage
              id="xpack.lens.editorFrame.emptyWorkspaceHeading"
              defaultMessage="Lens is a new tool for creating visualizations"
            />
          </p>
          <p>
            <small>
              <EuiLink
                href="https://www.elastic.co/products/kibana/feedback"
                target="_blank"
                external
              >
                <FormattedMessage
                  id="xpack.lens.editorFrame.goToForums"
                  defaultMessage="Make requests and give feedback"
                />
              </EuiLink>
            </small>
          </p>
        </EuiText>
      </div>
    );
  }

  function renderVisualization() {
    if (expression === null) {
      return renderEmptyWorkspace();
    }

    if (localState.expressionBuildError) {
      return (
        <EuiFlexGroup direction="column" alignItems="center">
          <EuiFlexItem>
            <EuiIcon type="alert" size="xl" color="danger" />
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="expression-failure">
            <FormattedMessage
              id="xpack.lens.editorFrame.expressionFailure"
              defaultMessage="An error occurred in the expression"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{localState.expressionBuildError}</EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <div className="lnsExpressionRenderer">
        <ExpressionRendererComponent
          className="lnsExpressionRenderer__component"
          padding="m"
          expression={expression!}
          searchContext={context}
          reload$={autoRefreshFetch$}
          onEvent={onEvent}
          renderError={(errorMessage?: string | null) => {
            return (
              <EuiFlexGroup direction="column" alignItems="center">
                <EuiFlexItem>
                  <EuiIcon type="alert" size="xl" color="danger" />
                </EuiFlexItem>
                <EuiFlexItem data-test-subj="expression-failure">
                  <FormattedMessage
                    id="xpack.lens.editorFrame.dataFailure"
                    defaultMessage="An error occurred when loading data."
                  />
                </EuiFlexItem>
                {errorMessage ? (
                  <EuiFlexItem className="eui-textBreakAll" grow={false}>
                    <EuiButtonEmpty
                      onClick={() => {
                        setLocalState((prevState) => ({
                          ...prevState,
                          expandError: !prevState.expandError,
                        }));
                      }}
                    >
                      {i18n.translate('xpack.lens.editorFrame.expandRenderingErrorButton', {
                        defaultMessage: 'Show details of error',
                      })}
                    </EuiButtonEmpty>

                    {localState.expandError ? errorMessage : null}
                  </EuiFlexItem>
                ) : null}
              </EuiFlexGroup>
            );
          }}
        />
      </div>
    );
  }

  return (
    <WorkspacePanelWrapper
      title={title}
      framePublicAPI={framePublicAPI}
      dispatch={dispatch}
      emptyExpression={expression === null}
      visualizationState={visualizationState}
      visualizationId={activeVisualizationId}
      datasourceStates={datasourceStates}
      datasourceMap={datasourceMap}
      visualizationMap={visualizationMap}
    >
      <DragDrop
        data-test-subj="lnsWorkspace"
        draggable={false}
        droppable={Boolean(suggestionForDraggedField)}
        onDrop={onDrop}
      >
        {renderVisualization()}
      </DragDrop>
    </WorkspacePanelWrapper>
  );
}
