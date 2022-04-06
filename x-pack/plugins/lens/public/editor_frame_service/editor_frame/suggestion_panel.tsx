/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './suggestion_panel.scss';

import { camelCase, pick } from 'lodash';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import {
  EuiIcon,
  EuiTitle,
  EuiPanel,
  EuiIconTip,
  EuiToolTip,
  EuiButtonEmpty,
  EuiAccordion,
  EuiText,
} from '@elastic/eui';
import { IconType } from '@elastic/eui/src/components/icon/icon';
import { Ast, toExpression } from '@kbn/interpreter';
import { i18n } from '@kbn/i18n';
import classNames from 'classnames';
import { ExecutionContextSearch } from 'src/plugins/data/public';
import {
  Datasource,
  Visualization,
  FramePublicAPI,
  DatasourcePublicAPI,
  DatasourceMap,
  VisualizationMap,
} from '../../types';
import { getSuggestions, switchToSuggestion } from './suggestion_helpers';
import {
  ReactExpressionRendererProps,
  ReactExpressionRendererType,
} from '../../../../../../src/plugins/expressions/public';
import { prependDatasourceExpression } from './expression_helpers';
import { trackUiEvent, trackSuggestionEvent } from '../../lens_ui_telemetry';
import {
  getMissingIndexPattern,
  validateDatasourceAndVisualization,
  getDatasourceLayers,
} from './state_helpers';
import {
  rollbackSuggestion,
  selectExecutionContextSearch,
  submitSuggestion,
  useLensDispatch,
  useLensSelector,
  selectCurrentVisualization,
  selectCurrentDatasourceStates,
  DatasourceStates,
  selectIsFullscreenDatasource,
  selectSearchSessionId,
  selectActiveDatasourceId,
  selectActiveData,
  selectDatasourceStates,
  selectChangesApplied,
  applyChanges,
} from '../../state_management';
import { DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS } from './config_panel/dimension_container';

const MAX_SUGGESTIONS_DISPLAYED = 5;
const LOCAL_STORAGE_SUGGESTIONS_PANEL = 'LENS_SUGGESTIONS_PANEL_HIDDEN';

export interface SuggestionPanelProps {
  datasourceMap: DatasourceMap;
  visualizationMap: VisualizationMap;
  ExpressionRenderer: ReactExpressionRendererType;
  frame: FramePublicAPI;
}

const PreviewRenderer = ({
  withLabel,
  ExpressionRendererComponent,
  expression,
  hasError,
}: {
  withLabel: boolean;
  expression: string | null | undefined;
  ExpressionRendererComponent: ReactExpressionRendererType;
  hasError: boolean;
}) => {
  const onErrorMessage = (
    <div className="lnsSuggestionPanel__suggestionIcon">
      <EuiIconTip
        size="xl"
        color="danger"
        type="alert"
        aria-label={i18n.translate('xpack.lens.editorFrame.previewErrorLabel', {
          defaultMessage: 'Preview rendering failed',
        })}
        content={i18n.translate('xpack.lens.editorFrame.previewErrorLabel', {
          defaultMessage: 'Preview rendering failed',
        })}
      />
    </div>
  );
  return (
    <div
      className={classNames('lnsSuggestionPanel__chartWrapper', {
        'lnsSuggestionPanel__chartWrapper--withLabel': withLabel,
      })}
    >
      {!expression || hasError ? (
        onErrorMessage
      ) : (
        <ExpressionRendererComponent
          className="lnsSuggestionPanel__expressionRenderer"
          padding="s"
          expression={expression}
          debounce={2000}
          renderError={() => {
            return onErrorMessage;
          }}
        />
      )}
    </div>
  );
};

const SuggestionPreview = ({
  preview,
  ExpressionRenderer: ExpressionRendererComponent,
  selected,
  onSelect,
  showTitleAsLabel,
}: {
  onSelect: () => void;
  preview: {
    expression?: Ast | null;
    icon: IconType;
    title: string;
    error?: boolean;
  };
  ExpressionRenderer: ReactExpressionRendererType;
  selected: boolean;
  showTitleAsLabel?: boolean;
}) => {
  return (
    <EuiToolTip content={preview.title}>
      <div data-test-subj={`lnsSuggestion-${camelCase(preview.title)}`}>
        <EuiPanel
          hasBorder
          hasShadow={false}
          className={classNames('lnsSuggestionPanel__button', {
            'lnsSuggestionPanel__button-isSelected': selected,
          })}
          paddingSize="none"
          data-test-subj="lnsSuggestion"
          onClick={onSelect}
          aria-current={!!selected}
          aria-label={preview.title}
        >
          {preview.expression || preview.error ? (
            <PreviewRenderer
              ExpressionRendererComponent={ExpressionRendererComponent}
              expression={preview.expression && toExpression(preview.expression)}
              withLabel={Boolean(showTitleAsLabel)}
              hasError={Boolean(preview.error)}
            />
          ) : (
            <span className="lnsSuggestionPanel__suggestionIcon">
              <EuiIcon size="xxl" type={preview.icon} />
            </span>
          )}
          {showTitleAsLabel && (
            <span className="lnsSuggestionPanel__buttonLabel">{preview.title}</span>
          )}
        </EuiPanel>
      </div>
    </EuiToolTip>
  );
};

export const SuggestionPanelWrapper = (props: SuggestionPanelProps) => {
  const isFullscreenDatasource = useLensSelector(selectIsFullscreenDatasource);
  return isFullscreenDatasource ? null : <SuggestionPanel {...props} />;
};

export function SuggestionPanel({
  datasourceMap,
  visualizationMap,
  frame,
  ExpressionRenderer: ExpressionRendererComponent,
}: SuggestionPanelProps) {
  const dispatchLens = useLensDispatch();
  const activeDatasourceId = useLensSelector(selectActiveDatasourceId);
  const activeData = useLensSelector(selectActiveData);
  const datasourceStates = useLensSelector(selectDatasourceStates);
  const existsStagedPreview = useLensSelector((state) => Boolean(state.lens.stagedPreview));
  const currentVisualization = useLensSelector(selectCurrentVisualization);
  const currentDatasourceStates = useLensSelector(selectCurrentDatasourceStates);
  const changesApplied = useLensSelector(selectChangesApplied);
  // get user's selection from localStorage, this key defines if the suggestions panel will be hidden or not
  const [hideSuggestions, setHideSuggestions] = useLocalStorage(
    LOCAL_STORAGE_SUGGESTIONS_PANEL,
    false
  );

  const toggleSuggestions = useCallback(() => {
    setHideSuggestions(!hideSuggestions);
  }, [setHideSuggestions, hideSuggestions]);

  const missingIndexPatterns = getMissingIndexPattern(
    activeDatasourceId ? datasourceMap[activeDatasourceId] : null,
    activeDatasourceId ? datasourceStates[activeDatasourceId] : null
  );
  const { suggestions, currentStateExpression, currentStateError } = useMemo(() => {
    const newSuggestions = missingIndexPatterns.length
      ? []
      : getSuggestions({
          datasourceMap,
          datasourceStates: currentDatasourceStates,
          visualizationMap,
          activeVisualization: currentVisualization.activeId
            ? visualizationMap[currentVisualization.activeId]
            : undefined,
          visualizationState: currentVisualization.state,
          activeData,
        })
          .filter(
            ({
              hide,
              visualizationId,
              visualizationState: suggestionVisualizationState,
              datasourceState: suggestionDatasourceState,
              datasourceId: suggestionDatasourceId,
            }) => {
              return (
                !hide &&
                validateDatasourceAndVisualization(
                  suggestionDatasourceId ? datasourceMap[suggestionDatasourceId] : null,
                  suggestionDatasourceState,
                  visualizationMap[visualizationId],
                  suggestionVisualizationState,
                  {
                    datasourceLayers: getDatasourceLayers(
                      suggestionDatasourceId
                        ? {
                            [suggestionDatasourceId]: {
                              isLoading: true,
                              state: suggestionDatasourceState,
                            },
                          }
                        : {},
                      datasourceMap
                    ),
                  }
                ) == null
              );
            }
          )
          .slice(0, MAX_SUGGESTIONS_DISPLAYED)
          .map((suggestion) => ({
            ...suggestion,
            previewExpression: preparePreviewExpression(
              suggestion,
              visualizationMap[suggestion.visualizationId],
              datasourceMap,
              currentDatasourceStates,
              frame
            ),
          }));

    const validationErrors = validateDatasourceAndVisualization(
      activeDatasourceId ? datasourceMap[activeDatasourceId] : null,
      activeDatasourceId && currentDatasourceStates[activeDatasourceId]?.state,
      currentVisualization.activeId ? visualizationMap[currentVisualization.activeId] : null,
      currentVisualization.state,
      frame
    );

    const newStateExpression =
      currentVisualization.state && currentVisualization.activeId && !validationErrors
        ? preparePreviewExpression(
            { visualizationState: currentVisualization.state },
            visualizationMap[currentVisualization.activeId],
            datasourceMap,
            currentDatasourceStates,
            frame
          )
        : undefined;

    return {
      suggestions: newSuggestions,
      currentStateExpression: newStateExpression,
      currentStateError: validationErrors,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentDatasourceStates,
    currentVisualization.state,
    currentVisualization.activeId,
    activeDatasourceId,
    datasourceMap,
    visualizationMap,
    frame.activeData,
  ]);

  const context: ExecutionContextSearch = useLensSelector(selectExecutionContextSearch);
  const searchSessionId = useLensSelector(selectSearchSessionId);

  const contextRef = useRef<ExecutionContextSearch>(context);
  contextRef.current = context;

  const sessionIdRef = useRef<string>(searchSessionId);
  sessionIdRef.current = searchSessionId;

  const AutoRefreshExpressionRenderer = useMemo(() => {
    return (props: ReactExpressionRendererProps) => (
      <ExpressionRendererComponent
        {...props}
        searchContext={contextRef.current}
        searchSessionId={sessionIdRef.current}
      />
    );
  }, [ExpressionRendererComponent]);

  const [lastSelectedSuggestion, setLastSelectedSuggestion] = useState<number>(-1);

  useEffect(() => {
    // if the staged preview is overwritten by a suggestion,
    // reset the selected index to "current visualization" because
    // we are not in transient suggestion state anymore
    if (!existsStagedPreview && lastSelectedSuggestion !== -1) {
      setLastSelectedSuggestion(-1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existsStagedPreview]);

  if (!activeDatasourceId) {
    return null;
  }

  if (suggestions.length === 0) {
    return null;
  }

  function rollbackToCurrentVisualization() {
    if (lastSelectedSuggestion !== -1) {
      trackSuggestionEvent('back_to_current');
      setLastSelectedSuggestion(-1);
      dispatchLens(rollbackSuggestion());
      dispatchLens(applyChanges());
    }
  }

  const renderApplyChangesPrompt = () => (
    <EuiPanel hasShadow={false} className="lnsSuggestionPanel__applyChangesPrompt" paddingSize="m">
      <EuiText size="s" color="subdued" className="lnsSuggestionPanel__applyChangesMessage">
        <p>
          <FormattedMessage
            id="xpack.lens.suggestions.applyChangesPrompt"
            defaultMessage="Latest changes must be applied to view suggestions."
          />
        </p>
      </EuiText>

      <EuiButtonEmpty
        iconType="checkInCircleFilled"
        size="s"
        className={DONT_CLOSE_DIMENSION_CONTAINER_ON_CLICK_CLASS}
        onClick={() => dispatchLens(applyChanges())}
        data-test-subj="lnsApplyChanges__suggestions"
      >
        <FormattedMessage
          id="xpack.lens.suggestions.applyChangesLabel"
          defaultMessage="Apply changes"
        />
      </EuiButtonEmpty>
    </EuiPanel>
  );

  const renderSuggestionsUI = () => (
    <>
      {currentVisualization.activeId && !hideSuggestions && (
        <SuggestionPreview
          preview={{
            error: currentStateError != null,
            expression: currentStateExpression,
            icon:
              visualizationMap[currentVisualization.activeId].getDescription(
                currentVisualization.state
              ).icon || 'empty',
            title: i18n.translate('xpack.lens.suggestions.currentVisLabel', {
              defaultMessage: 'Current visualization',
            }),
          }}
          ExpressionRenderer={AutoRefreshExpressionRenderer}
          onSelect={rollbackToCurrentVisualization}
          selected={lastSelectedSuggestion === -1}
          showTitleAsLabel
        />
      )}
      {!hideSuggestions &&
        suggestions.map((suggestion, index) => {
          return (
            <SuggestionPreview
              preview={{
                expression: suggestion.previewExpression,
                icon: suggestion.previewIcon,
                title: suggestion.title,
              }}
              ExpressionRenderer={AutoRefreshExpressionRenderer}
              key={index}
              onSelect={() => {
                trackUiEvent('suggestion_clicked');
                if (lastSelectedSuggestion === index) {
                  rollbackToCurrentVisualization();
                } else {
                  setLastSelectedSuggestion(index);
                  switchToSuggestion(dispatchLens, suggestion, { applyImmediately: true });
                }
              }}
              selected={index === lastSelectedSuggestion}
            />
          );
        })}
    </>
  );

  return (
    <div className="lnsSuggestionPanel">
      <EuiAccordion
        id="lensSuggestionsPanel"
        buttonContent={
          <EuiTitle size="xxs">
            <h3>
              <FormattedMessage
                id="xpack.lens.editorFrame.suggestionPanelTitle"
                defaultMessage="Suggestions"
              />
            </h3>
          </EuiTitle>
        }
        forceState={hideSuggestions ? 'closed' : 'open'}
        onToggle={toggleSuggestions}
        extraAction={
          existsStagedPreview &&
          !hideSuggestions && (
            <EuiToolTip
              content={i18n.translate('xpack.lens.suggestion.refreshSuggestionTooltip', {
                defaultMessage: 'Refresh the suggestions based on the selected visualization.',
              })}
            >
              <EuiButtonEmpty
                data-test-subj="lensSubmitSuggestion"
                size="xs"
                iconType="refresh"
                onClick={() => {
                  trackUiEvent('suggestion_confirmed');
                  dispatchLens(submitSuggestion());
                }}
              >
                {i18n.translate('xpack.lens.sugegstion.refreshSuggestionLabel', {
                  defaultMessage: 'Refresh',
                })}
              </EuiButtonEmpty>
            </EuiToolTip>
          )
        }
      >
        <div className="lnsSuggestionPanel__suggestions" data-test-subj="lnsSuggestionsPanel">
          {changesApplied ? renderSuggestionsUI() : renderApplyChangesPrompt()}
        </div>
      </EuiAccordion>
    </div>
  );
}

interface VisualizableState {
  visualizationState: unknown;
  datasourceState?: unknown;
  datasourceId?: string;
  keptLayerIds?: string[];
}

function getPreviewExpression(
  visualizableState: VisualizableState,
  visualization: Visualization,
  datasources: Record<string, Datasource>,
  frame: FramePublicAPI
) {
  if (!visualization.toPreviewExpression) {
    return null;
  }

  const suggestionFrameApi: FramePublicAPI = { datasourceLayers: { ...frame.datasourceLayers } };

  // use current frame api and patch apis for changed datasource layers
  if (
    visualizableState.keptLayerIds &&
    visualizableState.datasourceId &&
    visualizableState.datasourceState
  ) {
    const datasource = datasources[visualizableState.datasourceId];
    const datasourceState = visualizableState.datasourceState;
    const updatedLayerApis: Record<string, DatasourcePublicAPI> = pick(
      frame.datasourceLayers,
      visualizableState.keptLayerIds
    );
    const changedLayers = datasource.getLayers(visualizableState.datasourceState);
    changedLayers.forEach((layerId) => {
      if (updatedLayerApis[layerId]) {
        updatedLayerApis[layerId] = datasource.getPublicAPI({
          layerId,
          state: datasourceState,
        });
      }
    });
  }

  return visualization.toPreviewExpression(
    visualizableState.visualizationState,
    suggestionFrameApi.datasourceLayers
  );
}

function preparePreviewExpression(
  visualizableState: VisualizableState,
  visualization: Visualization,
  datasourceMap: DatasourceMap,
  datasourceStates: DatasourceStates,
  framePublicAPI: FramePublicAPI
) {
  const suggestionDatasourceId = visualizableState.datasourceId;
  const suggestionDatasourceState = visualizableState.datasourceState;

  const expression = getPreviewExpression(
    visualizableState,
    visualization,
    datasourceMap,
    framePublicAPI
  );

  if (!expression) {
    return;
  }

  const expressionWithDatasource = prependDatasourceExpression(
    expression,
    datasourceMap,
    suggestionDatasourceId
      ? {
          ...datasourceStates,
          [suggestionDatasourceId]: {
            isLoading: false,
            state: suggestionDatasourceState,
          },
        }
      : datasourceStates,
    visualizableState.visualizationState,
    visualization
  );

  return expressionWithDatasource;
}
