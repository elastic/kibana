/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, useContext, useCallback } from 'react';
import classNames from 'classnames';
import { FormattedMessage } from '@kbn/i18n/react';
import { toExpression } from '@kbn/interpreter/common';
import { i18n } from '@kbn/i18n';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonEmpty,
  EuiLink,
  EuiPageContentBody,
} from '@elastic/eui';
import { CoreStart, ApplicationStart } from 'kibana/public';
import {
  DataPublicPluginStart,
  ExecutionContextSearch,
  TimefilterContract,
} from 'src/plugins/data/public';
import { RedirectAppLinks } from '../../../../../../../src/plugins/kibana_react/public';
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
  isLensEditEvent,
} from '../../../types';
import { DragDrop, DragContext, DragDropIdentifier } from '../../../drag_drop';
import { Suggestion, switchToSuggestion } from '../suggestion_helpers';
import { buildExpression } from '../expression_helpers';
import { trackUiEvent } from '../../../lens_ui_telemetry';
import {
  UiActionsStart,
  VisualizeFieldContext,
} from '../../../../../../../src/plugins/ui_actions/public';
import { VIS_EVENT_TO_TRIGGER } from '../../../../../../../src/plugins/visualizations/public';
import { WorkspacePanelWrapper } from './workspace_panel_wrapper';
import { DropIllustration } from '../../../assets/drop_illustration';
import { getOriginalRequestErrorMessages } from '../../error_helper';
import { getMissingIndexPattern, validateDatasourceAndVisualization } from '../state_helpers';
import { DefaultInspectorAdapters } from '../../../../../../../src/plugins/expressions/common';

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
  core: CoreStart;
  plugins: { uiActions?: UiActionsStart; data: DataPublicPluginStart };
  title?: string;
  visualizeTriggerFieldContext?: VisualizeFieldContext;
  getSuggestionForField: (field: DragDropIdentifier) => Suggestion | undefined;
}

interface WorkspaceState {
  expressionBuildError?: Array<{ shortMessage: string; longMessage: string }>;
  expandError: boolean;
}

const dropProps = {
  value: {
    id: 'lnsWorkspace',
    humanData: {
      label: i18n.translate('xpack.lens.editorFrame.workspaceLabel', {
        defaultMessage: 'Workspace',
      }),
    },
  },
  order: [1, 0, 0, 0],
};

// Exported for testing purposes only.
export const WorkspacePanel = React.memo(function WorkspacePanel(props: WorkspacePanelProps) {
  const { getSuggestionForField, ...restProps } = props;

  const dragDropContext = useContext(DragContext);

  const suggestionForDraggedField = useMemo(
    () => dragDropContext.dragging && getSuggestionForField(dragDropContext.dragging),
    [dragDropContext.dragging, getSuggestionForField]
  );

  return (
    <InnerWorkspacePanel {...restProps} suggestionForDraggedField={suggestionForDraggedField} />
  );
});

// Exported for testing purposes only.
export const InnerWorkspacePanel = React.memo(function InnerWorkspacePanel({
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
  suggestionForDraggedField,
}: Omit<WorkspacePanelProps, 'getSuggestionForField'> & {
  suggestionForDraggedField: Suggestion | undefined;
}) {
  const [localState, setLocalState] = useState<WorkspaceState>({
    expressionBuildError: undefined,
    expandError: false,
  });

  const activeVisualization = activeVisualizationId
    ? visualizationMap[activeVisualizationId]
    : null;

  const missingIndexPatterns = getMissingIndexPattern(
    activeDatasourceId ? datasourceMap[activeDatasourceId] : null,
    activeDatasourceId ? datasourceStates[activeDatasourceId] : null
  );

  const missingRefsErrors = missingIndexPatterns.length
    ? [
        {
          shortMessage: '',
          longMessage: i18n.translate('xpack.lens.indexPattern.missingIndexPattern', {
            defaultMessage:
              'The {count, plural, one {index pattern} other {index patterns}} ({count, plural, one {id} other {ids}}: {indexpatterns}) cannot be found',
            values: {
              count: missingIndexPatterns.length,
              indexpatterns: missingIndexPatterns.join(', '),
            },
          }),
        },
      ]
    : [];

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
      if (!configurationValidationError?.length && !missingRefsErrors.length) {
        try {
          const ast = buildExpression({
            visualization: activeVisualization,
            visualizationState,
            datasourceMap,
            datasourceStates,
            datasourceLayers: framePublicAPI.datasourceLayers,
          });
          if (ast) {
            // expression has to be turned into a string for dirty checking - if the ast is rebuilt,
            // turning it into a string will make sure the expression renderer only re-renders if the
            // expression actually changed.
            return toExpression(ast);
          } else {
            return null;
          }
        } catch (e) {
          const buildMessages = activeVisualization?.getErrorMessages(visualizationState);
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

  const expressionExists = Boolean(expression);

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
      if (isLensEditEvent(event) && activeVisualization?.onEditAction) {
        dispatch({
          type: 'UPDATE_VISUALIZATION_STATE',
          visualizationId: activeVisualization.id,
          updater: (oldState: unknown) => activeVisualization.onEditAction!(oldState, event),
        });
      }
    },
    [plugins.uiActions, dispatch, activeVisualization]
  );

  useEffect(() => {
    // reset expression error if component attempts to run it again
    if (expressionExists && localState.expressionBuildError) {
      setLocalState((s) => ({
        ...s,
        expressionBuildError: undefined,
      }));
    }
  }, [expressionExists, localState.expressionBuildError]);

  const onDrop = useCallback(() => {
    if (suggestionForDraggedField) {
      trackUiEvent('drop_onto_workspace');
      trackUiEvent(expressionExists ? 'drop_non_empty' : 'drop_empty');
      switchToSuggestion(dispatch, suggestionForDraggedField, 'SWITCH_VISUALIZATION');
    }
  }, [suggestionForDraggedField, expressionExists, dispatch]);

  const renderEmptyWorkspace = () => {
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
            {!expressionExists
              ? i18n.translate('xpack.lens.editorFrame.emptyWorkspace', {
                  defaultMessage: 'Drop some fields here to start',
                })
              : i18n.translate('xpack.lens.editorFrame.emptyWorkspaceSimple', {
                  defaultMessage: 'Drop field here',
                })}
          </strong>
        </h2>
        <DropIllustration aria-hidden={true} className="lnsWorkspacePanel__dropIllustration" />
        {!expressionExists && (
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
  };

  const renderVisualization = () => {
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
        localState={{ ...localState, configurationValidationError, missingRefsErrors }}
        ExpressionRendererComponent={ExpressionRendererComponent}
        application={core.application}
      />
    );
  };

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
        dataTestSubj="lnsWorkspace"
        draggable={false}
        dropTypes={suggestionForDraggedField ? ['field_add'] : undefined}
        onDrop={onDrop}
        value={dropProps.value}
        order={dropProps.order}
      >
        <EuiPageContentBody className="lnsWorkspacePanelWrapper__pageContentBody">
          {renderVisualization()}
          {Boolean(suggestionForDraggedField) && expression !== null && renderEmptyWorkspace()}
        </EuiPageContentBody>
      </DragDrop>
    </WorkspacePanelWrapper>
  );
});

export const VisualizationWrapper = ({
  expression,
  framePublicAPI,
  timefilter,
  onEvent,
  setLocalState,
  localState,
  ExpressionRendererComponent,
  dispatch,
  application,
}: {
  expression: string | null | undefined;
  framePublicAPI: FramePublicAPI;
  timefilter: TimefilterContract;
  onEvent: (event: ExpressionRendererEvent) => void;
  dispatch: (action: Action) => void;
  setLocalState: (dispatch: (prevState: WorkspaceState) => WorkspaceState) => void;
  localState: WorkspaceState & {
    configurationValidationError?: Array<{ shortMessage: string; longMessage: string }>;
    missingRefsErrors?: Array<{ shortMessage: string; longMessage: string }>;
  };
  ExpressionRendererComponent: ReactExpressionRendererType;
  application: ApplicationStart;
}) => {
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
    (data: unknown, inspectorAdapters?: Partial<DefaultInspectorAdapters>) => {
      if (inspectorAdapters && inspectorAdapters.tables) {
        dispatch({
          type: 'UPDATE_ACTIVE_DATA',
          tables: inspectorAdapters.tables.tables,
        });
      }
    },
    [dispatch]
  );

  if (localState.configurationValidationError?.length) {
    let showExtraErrors = null;
    let showExtraErrorsAction = null;

    if (localState.configurationValidationError.length > 1) {
      if (localState.expandError) {
        showExtraErrors = localState.configurationValidationError
          .slice(1)
          .map(({ longMessage }) => (
            <p
              key={longMessage}
              className="eui-textBreakWord"
              data-test-subj="configuration-failure-error"
            >
              {longMessage}
            </p>
          ));
      } else {
        showExtraErrorsAction = (
          <EuiButtonEmpty
            onClick={() => {
              setLocalState((prevState: WorkspaceState) => ({
                ...prevState,
                expandError: !prevState.expandError,
              }));
            }}
            data-test-subj="configuration-failure-more-errors"
          >
            {i18n.translate('xpack.lens.editorFrame.configurationFailureMoreErrors', {
              defaultMessage: ` +{errors} {errors, plural, one {error} other {errors}}`,
              values: { errors: localState.configurationValidationError.length - 1 },
            })}
          </EuiButtonEmpty>
        );
      }
    }

    return (
      <EuiFlexGroup data-test-subj="configuration-failure">
        <EuiFlexItem>
          <EuiEmptyPrompt
            actions={showExtraErrorsAction}
            body={
              <>
                <p className="eui-textBreakWord" data-test-subj="configuration-failure-error">
                  {localState.configurationValidationError[0].longMessage}
                </p>

                {showExtraErrors}
              </>
            }
            iconColor="danger"
            iconType="alert"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (localState.missingRefsErrors?.length) {
    // Check for access to both Management app && specific indexPattern section
    const { management: isManagementEnabled } = application.capabilities.navLinks;
    const isIndexPatternManagementEnabled =
      application.capabilities.management.kibana.indexPatterns;
    return (
      <EuiFlexGroup data-test-subj="configuration-failure">
        <EuiFlexItem>
          <EuiEmptyPrompt
            actions={
              isManagementEnabled && isIndexPatternManagementEnabled ? (
                <RedirectAppLinks application={application}>
                  <a
                    href={application.getUrlForApp('management', {
                      path: '/kibana/indexPatterns/create',
                    })}
                    data-test-subj="configuration-failure-reconfigure-indexpatterns"
                  >
                    {i18n.translate('xpack.lens.editorFrame.indexPatternReconfigure', {
                      defaultMessage: `Recreate it in the index pattern management page`,
                    })}
                  </a>
                </RedirectAppLinks>
              ) : null
            }
            body={
              <>
                <p className="eui-textBreakWord" data-test-subj="missing-refs-failure">
                  <FormattedMessage
                    id="xpack.lens.editorFrame.indexPatternNotFound"
                    defaultMessage="Index pattern not found"
                  />
                </p>
                <p className="eui-textBreakWord lnsSelectableErrorMessage">
                  {localState.missingRefsErrors[0].longMessage}
                </p>
              </>
            }
            iconColor="danger"
            iconType="alert"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (localState.expressionBuildError?.length) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiEmptyPrompt
            body={
              <>
                <p data-test-subj="expression-failure">
                  <FormattedMessage
                    id="xpack.lens.editorFrame.expressionFailure"
                    defaultMessage="An error occurred in the expression"
                  />
                </p>

                <p>{localState.expressionBuildError[0].longMessage}</p>
              </>
            }
            iconColor="danger"
            iconType="alert"
          />
        </EuiFlexItem>
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
        searchSessionId={framePublicAPI.searchSessionId}
        onEvent={onEvent}
        onData$={onData$}
        renderMode="edit"
        renderError={(errorMessage?: string | null, error?: ExpressionRenderError | null) => {
          const errorsFromRequest = getOriginalRequestErrorMessages(error);
          const visibleErrorMessages = errorsFromRequest.length
            ? errorsFromRequest
            : errorMessage
            ? [errorMessage]
            : [];

          return (
            <EuiFlexGroup>
              <EuiFlexItem>
                <EuiEmptyPrompt
                  actions={
                    visibleErrorMessages.length && !localState.expandError ? (
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
                    ) : null
                  }
                  body={
                    <>
                      <p data-test-subj="expression-failure">
                        <FormattedMessage
                          id="xpack.lens.editorFrame.dataFailure"
                          defaultMessage="An error occurred when loading data."
                        />
                      </p>

                      {localState.expandError
                        ? visibleErrorMessages.map((visibleErrorMessage) => (
                            <p className="eui-textBreakWord" key={visibleErrorMessage}>
                              {visibleErrorMessage}
                            </p>
                          ))
                        : null}
                    </>
                  }
                  iconColor="danger"
                  iconType="alert"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }}
      />
    </div>
  );
};
