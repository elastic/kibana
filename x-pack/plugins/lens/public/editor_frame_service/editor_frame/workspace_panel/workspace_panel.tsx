/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n/react';
import { Ast } from '@kbn/interpreter/common';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTextColor,
  EuiButtonEmpty,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import { CoreStart, CoreSetup } from 'kibana/public';
import {
  DataPublicPluginStart,
  ExecutionContextSearch,
  TimefilterContract,
} from 'src/plugins/data/public';
import {
  ExpressionRendererEvent,
  ExpressionRenderError,
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
import {
  UiActionsStart,
  VisualizeFieldContext,
} from '../../../../../../../src/plugins/ui_actions/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../../../src/plugins/visualizations/public';
import { WorkspacePanelWrapper } from './workspace_panel_wrapper';
import { DropIllustration } from '../../../assets/drop_illustration';
import { LensInspectorAdapters } from '../../types';
import { getOriginalRequestErrorMessage } from '../../error_helper';
import { validateDatasourceAndVisualization } from '../state_helpers';

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
  visualizeTriggerFieldContext?: VisualizeFieldContext;
}

interface WorkspaceState {
  expressionBuildError?: Array<{ shortMessage: string; longMessage: string }>;
  expandError: boolean;
}

// Exported for testing purposes only.
export function WorkspacePanel({
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
  visualizeTriggerFieldContext,
}: WorkspacePanelProps) {
  const dragDropContext = useContext(DragContext);

  const suggestionForDraggedField = useMemo(
    () => {
      if (!dragDropContext.dragging || !activeDatasourceId) {
        return;
      }

      const hasData = Object.values(framePublicAPI.datasourceLayers).some(
        (datasource) => datasource.getTableSpec().length > 0
      );

      const mainPalette =
        activeVisualizationId &&
        visualizationMap[activeVisualizationId] &&
        visualizationMap[activeVisualizationId].getMainPalette
          ? visualizationMap[activeVisualizationId].getMainPalette!(visualizationState)
          : undefined;
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
        mainPalette,
      });

      return suggestions.find((s) => s.visualizationId === activeVisualizationId) || suggestions[0];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dragDropContext.dragging]
  );

  const [localState, setLocalState] = useState<WorkspaceState>({
    expressionBuildError: undefined,
    expandError: false,
  });

  const activeVisualization = activeVisualizationId
    ? visualizationMap[activeVisualizationId]
    : null;

  // Note: mind to all these eslint disable lines: the frameAPI will change too frequently
  // and to prevent race conditions it is ok to leave them there.

  const configurationValidationError = useMemo(
    () =>
      validateDatasourceAndVisualization(
        activeDatasourceId ? datasourceMap[activeDatasourceId] : null,
        activeDatasourceId && datasourceStates[activeDatasourceId]?.state,
        activeVisualization,
        visualizationState,
        framePublicAPI
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeVisualization, visualizationState, activeDatasourceId, datasourceMap, datasourceStates]
  );

  const expression = useMemo(
    () => {
      if (!configurationValidationError) {
        try {
          return buildExpression({
            visualization: activeVisualization,
            visualizationState,
            datasourceMap,
            datasourceStates,
            datasourceLayers: framePublicAPI.datasourceLayers,
          });
        } catch (e) {
          const buildMessages = activeVisualization?.getErrorMessages(
            visualizationState,
            framePublicAPI
          );
          const defaultMessage = {
            shortMessage: i18n.translate('xpack.lens.editorFrame.buildExpressionError', {
              defaultMessage: 'An unexpected error occurred while preparing the chart',
            }),
            longMessage: e.toString(),
          };
          // Most likely an error in the expression provided by a datasource or visualization
          setLocalState((s) => ({
            ...s,
            expressionBuildError: buildMessages ?? [defaultMessage],
          }));
        }
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
      <EuiText
        className={classNames('lnsWorkspacePanel__emptyContent')}
        textAlign="center"
        color="subdued"
        data-test-subj="empty-workspace"
        size="s"
      >
        <h2>
          <strong>
            {expression === null
              ? i18n.translate('xpack.lens.editorFrame.emptyWorkspace', {
                  defaultMessage: 'Drop some fields here to start',
                })
              : i18n.translate('xpack.lens.editorFrame.emptyWorkspaceSimple', {
                  defaultMessage: 'Drop field here',
                })}
          </strong>
        </h2>
        <DropIllustration aria-hidden={true} className="lnsWorkspacePanel__dropIllustration" />
        {expression === null && (
          <>
            <p>
              {i18n.translate('xpack.lens.editorFrame.emptyWorkspaceHeading', {
                defaultMessage: 'Lens is a new tool for creating visualization',
              })}
            </p>
            <p>
              <small>
                <EuiLink
                  href="https://www.elastic.co/products/kibana/feedback"
                  target="_blank"
                  external
                >
                  {i18n.translate('xpack.lens.editorFrame.goToForums', {
                    defaultMessage: 'Make requests and give feedback',
                  })}
                </EuiLink>
              </small>
            </p>
          </>
        )}
      </EuiText>
    );
  }

  function renderVisualization() {
    // we don't want to render the emptyWorkspace on visualizing field from Discover
    // as it is specific for the drag and drop functionality and can confuse the users
    if (expression === null && !visualizeTriggerFieldContext) {
      return renderEmptyWorkspace();
    }
    return (
      <VisualizationWrapper
        expression={expression}
        framePublicAPI={framePublicAPI}
        timefilter={plugins.data.query.timefilter.timefilter}
        dispatch={dispatch}
        onEvent={onEvent}
        setLocalState={setLocalState}
        localState={{ ...localState, configurationValidationError }}
        ExpressionRendererComponent={ExpressionRendererComponent}
      />
    );
  }

  return (
    <WorkspacePanelWrapper
      title={title}
      framePublicAPI={framePublicAPI}
      dispatch={dispatch}
      visualizationState={visualizationState}
      visualizationId={activeVisualizationId}
      datasourceStates={datasourceStates}
      datasourceMap={datasourceMap}
      visualizationMap={visualizationMap}
    >
      <DragDrop
        className="lnsWorkspacePanel__dragDrop"
        data-test-subj="lnsWorkspace"
        draggable={false}
        droppable={Boolean(suggestionForDraggedField)}
        onDrop={onDrop}
      >
        <div>
          {renderVisualization()}
          {Boolean(suggestionForDraggedField) && expression !== null && renderEmptyWorkspace()}
        </div>
      </DragDrop>
    </WorkspacePanelWrapper>
  );
}

export const InnerVisualizationWrapper = ({
  expression,
  framePublicAPI,
  timefilter,
  onEvent,
  setLocalState,
  localState,
  ExpressionRendererComponent,
  dispatch,
}: {
  expression: Ast | null | undefined;
  framePublicAPI: FramePublicAPI;
  timefilter: TimefilterContract;
  onEvent: (event: ExpressionRendererEvent) => void;
  dispatch: (action: Action) => void;
  setLocalState: (dispatch: (prevState: WorkspaceState) => WorkspaceState) => void;
  localState: WorkspaceState & {
    configurationValidationError?: Array<{ shortMessage: string; longMessage: string }>;
  };
  ExpressionRendererComponent: ReactExpressionRendererType;
}) => {
  const autoRefreshFetch$ = useMemo(() => timefilter.getAutoRefreshFetch$(), [timefilter]);

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

  const onData$ = useCallback(
    (data: unknown, inspectorAdapters?: LensInspectorAdapters) => {
      if (inspectorAdapters && inspectorAdapters.tables) {
        dispatch({
          type: 'UPDATE_ACTIVE_DATA',
          tables: inspectorAdapters.tables,
        });
      }
    },
    [dispatch]
  );

  if (localState.configurationValidationError?.length) {
    let showExtraErrors = null;
    if (localState.configurationValidationError.length > 1) {
      if (localState.expandError) {
        showExtraErrors = localState.configurationValidationError
          .slice(1)
          .map(({ longMessage }) => (
            <EuiFlexItem key={longMessage} className="eui-textBreakAll">
              {longMessage}
            </EuiFlexItem>
          ));
      } else {
        showExtraErrors = (
          <EuiFlexItem data-test-subj="configuration-failure-more-errors">
            <EuiButtonEmpty
              onClick={() => {
                setLocalState((prevState: WorkspaceState) => ({
                  ...prevState,
                  expandError: !prevState.expandError,
                }));
              }}
            >
              {i18n.translate('xpack.lens.editorFrame.configurationFailureMoreErrors', {
                defaultMessage: ` +{errors} {errors, plural, one {error} other {errors}}`,
                values: { errors: localState.configurationValidationError.length - 1 },
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        );
      }
    }

    return (
      <EuiFlexGroup
        style={{ maxWidth: '100%' }}
        direction="column"
        alignItems="center"
        data-test-subj="configuration-failure"
      >
        <EuiFlexItem>
          <EuiIcon type="alert" size="xl" color="danger" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <EuiTextColor color="danger">
              <FormattedMessage
                id="xpack.lens.editorFrame.configurationFailure"
                defaultMessage="Invalid configuration"
              />
            </EuiTextColor>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem className="eui-textBreakAll">
          {localState.configurationValidationError[0].longMessage}
        </EuiFlexItem>
        {showExtraErrors}
      </EuiFlexGroup>
    );
  }

  if (localState.expressionBuildError?.length) {
    return (
      <EuiFlexGroup style={{ maxWidth: '100%' }} direction="column" alignItems="center">
        <EuiFlexItem>
          <EuiIcon type="alert" size="xl" color="danger" />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="expression-failure">
          <FormattedMessage
            id="xpack.lens.editorFrame.expressionFailure"
            defaultMessage="An error occurred in the expression"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{localState.expressionBuildError[0].longMessage}</EuiFlexItem>
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
        onData$={onData$}
        renderError={(errorMessage?: string | null, error?: ExpressionRenderError | null) => {
          const visibleErrorMessage = getOriginalRequestErrorMessage(error) || errorMessage;

          return (
            <EuiFlexGroup style={{ maxWidth: '100%' }} direction="column" alignItems="center">
              <EuiFlexItem>
                <EuiIcon type="alert" size="xl" color="danger" />
              </EuiFlexItem>
              <EuiFlexItem data-test-subj="expression-failure">
                <FormattedMessage
                  id="xpack.lens.editorFrame.dataFailure"
                  defaultMessage="An error occurred when loading data."
                />
              </EuiFlexItem>
              {visibleErrorMessage ? (
                <EuiFlexItem className="eui-textBreakAll" grow={false}>
                  <EuiButtonEmpty
                    onClick={() => {
                      setLocalState((prevState: WorkspaceState) => ({
                        ...prevState,
                        expandError: !prevState.expandError,
                      }));
                    }}
                  >
                    {i18n.translate('xpack.lens.editorFrame.expandRenderingErrorButton', {
                      defaultMessage: 'Show details of error',
                    })}
                  </EuiButtonEmpty>

                  {localState.expandError ? visibleErrorMessage : null}
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
          );
        }}
      />
    </div>
  );
};

export const VisualizationWrapper = debouncedComponent(InnerVisualizationWrapper);
