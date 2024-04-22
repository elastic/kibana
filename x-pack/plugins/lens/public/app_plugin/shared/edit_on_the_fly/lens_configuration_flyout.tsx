/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { isEqual } from 'lodash';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiTitle,
  EuiAccordion,
  useEuiTheme,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  euiScrollBarStyles,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import type { Datatable } from '@kbn/expressions-plugin/public';
import {
  getAggregateQueryMode,
  isOfAggregateQueryType,
  getLanguageDisplayName,
} from '@kbn/es-query';
import type { AggregateQuery, Query } from '@kbn/es-query';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import { buildExpression } from '../../../editor_frame_service/editor_frame/expression_helpers';
import { MAX_NUM_OF_COLUMNS } from '../../../datasources/text_based/utils';
import {
  useLensSelector,
  selectFramePublicAPI,
  onActiveDataChange,
  useLensDispatch,
} from '../../../state_management';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import { EXPRESSION_BUILD_ERROR_ID, extractReferencesFromState } from '../../../utils';
import { LayerConfiguration } from './layer_configuration_section';
import type { EditConfigPanelProps } from './types';
import { FlyoutWrapper } from './flyout_wrapper';
import { getSuggestions } from './helpers';
import { SuggestionPanel } from '../../../editor_frame_service/editor_frame/suggestion_panel';
import { useApplicationUserMessages } from '../../get_application_user_messages';
import { trackUiCounterEvents } from '../../../lens_ui_telemetry';

export function LensEditConfigurationFlyout({
  attributes,
  coreStart,
  startDependencies,
  visualizationMap,
  datasourceMap,
  datasourceId,
  updatePanelState,
  updateSuggestion,
  setCurrentAttributes,
  closeFlyout,
  saveByRef,
  savedObjectId,
  updateByRefInput,
  output$,
  lensAdapters,
  navigateToLensEditor,
  displayFlyoutHeader,
  canEditTextBasedQuery,
  isNewPanel,
  deletePanel,
  hidesSuggestions,
  onApplyCb,
  onCancelCb,
  hideTimeFilterInfo,
}: EditConfigPanelProps) {
  const euiTheme = useEuiTheme();
  const previousAttributes = useRef<TypedLensByValueInput['attributes']>(attributes);
  const previousAdapters = useRef<Partial<DefaultInspectorAdapters> | undefined>(lensAdapters);
  const prevQuery = useRef<AggregateQuery | Query>(attributes.state.query);
  const [query, setQuery] = useState<AggregateQuery | Query>(attributes.state.query);
  const [errors, setErrors] = useState<Error[] | undefined>();
  const [isInlineFlyoutVisible, setIsInlineFlyoutVisible] = useState(true);
  const [isLayerAccordionOpen, setIsLayerAccordionOpen] = useState(true);
  const [suggestsLimitedColumns, setSuggestsLimitedColumns] = useState(false);
  const [isSuggestionsAccordionOpen, setIsSuggestionsAccordionOpen] = useState(false);
  const [isVisualizationLoading, setIsVisualizationLoading] = useState(false);
  const datasourceState = attributes.state.datasourceStates[datasourceId];
  const activeDatasource = datasourceMap[datasourceId];

  const { datasourceStates, visualization, isLoading, annotationGroups, searchSessionId } =
    useLensSelector((state) => state.lens);
  // use the latest activeId, but fallback to attributes
  const activeVisualization =
    visualizationMap[visualization.activeId ?? attributes.visualizationType];

  const framePublicAPI = useLensSelector((state) => selectFramePublicAPI(state, datasourceMap));

  const layers = useMemo(
    () => activeDatasource.getLayers(datasourceState),
    [activeDatasource, datasourceState]
  );

  const dispatch = useLensDispatch();
  useEffect(() => {
    const s = output$?.subscribe(() => {
      const activeData: Record<string, Datatable> = {};
      const adaptersTables = previousAdapters.current?.tables?.tables as Record<string, Datatable>;
      const [table] = Object.values(adaptersTables || {});
      if (table) {
        // there are cases where a query can return a big amount of columns
        // at this case we don't suggest all columns in a table but the first
        // MAX_NUM_OF_COLUMNS
        const columns = Object.keys(table.rows?.[0]) ?? [];
        setSuggestsLimitedColumns(columns.length >= MAX_NUM_OF_COLUMNS);
        layers.forEach((layer) => {
          activeData[layer] = table;
        });

        dispatch(onActiveDataChange({ activeData }));
      }
    });
    return () => s?.unsubscribe();
  }, [dispatch, output$, layers]);

  const attributesChanged: boolean = useMemo(() => {
    const previousAttrs = previousAttributes.current;

    const datasourceStatesAreSame =
      datasourceStates[datasourceId].state && previousAttrs.state.datasourceStates[datasourceId]
        ? datasourceMap[datasourceId].isEqual(
            previousAttrs.state.datasourceStates[datasourceId],
            previousAttrs.references,
            datasourceStates[datasourceId].state,
            attributes.references
          )
        : false;

    const visualizationState = visualization.state;
    const customIsEqual = visualizationMap[previousAttrs.visualizationType]?.isEqual;
    const visualizationStateIsEqual = customIsEqual
      ? (() => {
          try {
            return customIsEqual(
              previousAttrs.state.visualization,
              previousAttrs.references,
              visualizationState,
              attributes.references,
              annotationGroups
            );
          } catch (err) {
            return false;
          }
        })()
      : isEqual(visualizationState, previousAttrs.state.visualization);

    return !visualizationStateIsEqual || !datasourceStatesAreSame;
  }, [
    attributes.references,
    datasourceId,
    datasourceMap,
    datasourceStates,
    visualizationMap,
    annotationGroups,
    visualization.state,
  ]);

  const onCancel = useCallback(() => {
    const previousAttrs = previousAttributes.current;
    if (attributesChanged) {
      if (previousAttrs.visualizationType === visualization.activeId) {
        const currentDatasourceState = datasourceMap[datasourceId].injectReferencesToLayers
          ? datasourceMap[datasourceId]?.injectReferencesToLayers?.(
              previousAttrs.state.datasourceStates[datasourceId],
              previousAttrs.references
            )
          : previousAttrs.state.datasourceStates[datasourceId];
        updatePanelState?.(currentDatasourceState, previousAttrs.state.visualization);
      } else {
        updateSuggestion?.(previousAttrs);
      }
      if (savedObjectId) {
        updateByRefInput?.(savedObjectId);
      }
    }
    // for a newly created chart, I want cancelling to also remove the panel
    if (isNewPanel && deletePanel) {
      deletePanel();
    }
    onCancelCb?.();
    closeFlyout?.();
  }, [
    attributesChanged,
    isNewPanel,
    deletePanel,
    closeFlyout,
    visualization.activeId,
    savedObjectId,
    datasourceMap,
    datasourceId,
    updatePanelState,
    updateSuggestion,
    updateByRefInput,
    onCancelCb,
  ]);

  const onApply = useCallback(() => {
    const dsStates = Object.fromEntries(
      Object.entries(datasourceStates).map(([id, ds]) => {
        const dsState = ds.state;
        return [id, dsState];
      })
    );
    const references = extractReferencesFromState({
      activeDatasources: Object.keys(datasourceStates).reduce(
        (acc, id) => ({
          ...acc,
          [id]: datasourceMap[id],
        }),
        {}
      ),
      datasourceStates,
      visualizationState: visualization.state,
      activeVisualization,
    });
    const attrs = {
      ...attributes,
      state: {
        ...attributes.state,
        visualization: visualization.state,
        datasourceStates: dsStates,
      },
      references,
      visualizationType: visualization.activeId,
      title: visualization.activeId ?? '',
    };
    if (savedObjectId) {
      saveByRef?.(attrs);
      updateByRefInput?.(savedObjectId);
    }

    // check if visualization type changed, if it did, don't pass the previous visualization state
    const prevVisState =
      previousAttributes.current.visualizationType === visualization.activeId
        ? previousAttributes.current.state.visualization
        : undefined;
    const telemetryEvents = activeVisualization.getTelemetryEventsOnSave?.(
      visualization.state,
      prevVisState
    );
    if (telemetryEvents && telemetryEvents.length) {
      trackUiCounterEvents(telemetryEvents);
    }

    onApplyCb?.(attrs as TypedLensByValueInput['attributes']);
    closeFlyout?.();
  }, [
    visualization.activeId,
    savedObjectId,
    closeFlyout,
    onApplyCb,
    datasourceStates,
    visualization.state,
    activeVisualization,
    attributes,
    datasourceMap,
    saveByRef,
    updateByRefInput,
  ]);

  const { getUserMessages } = useApplicationUserMessages({
    coreStart,
    framePublicAPI,
    activeDatasourceId: datasourceId,
    datasourceState: datasourceStates[datasourceId],
    datasource: datasourceMap[datasourceId],
    dispatch,
    visualization: activeVisualization,
    visualizationType: visualization.activeId,
    visualizationState: visualization,
  });

  // needed for text based languages mode which works ONLY with adHoc dataviews
  const adHocDataViews = Object.values(attributes.state.adHocDataViews ?? {});

  const runQuery = useCallback(
    async (q, abortController) => {
      const attrs = await getSuggestions(
        q,
        startDependencies,
        datasourceMap,
        visualizationMap,
        adHocDataViews,
        setErrors,
        abortController
      );
      if (attrs) {
        setCurrentAttributes?.(attrs);
        setErrors([]);
        updateSuggestion?.(attrs);
      }
      setIsVisualizationLoading(false);
    },
    [
      startDependencies,
      datasourceMap,
      visualizationMap,
      adHocDataViews,
      setCurrentAttributes,
      updateSuggestion,
    ]
  );

  const isSaveable = useMemo(() => {
    if (!attributesChanged) {
      return false;
    }
    if (!visualization.state || !visualization.activeId) {
      return false;
    }
    const visualizationErrors = getUserMessages(['visualization'], {
      severity: 'error',
    });
    // shouldn't build expression if there is any type of error other than an expression build error
    // (in which case we try again every time because the config might have changed)
    if (visualizationErrors.every((error) => error.uniqueId === EXPRESSION_BUILD_ERROR_ID)) {
      return Boolean(
        buildExpression({
          visualization: activeVisualization,
          visualizationState: visualization.state,
          datasourceMap,
          datasourceStates,
          datasourceLayers: framePublicAPI.datasourceLayers,
          indexPatterns: framePublicAPI.dataViews.indexPatterns,
          dateRange: framePublicAPI.dateRange,
          nowInstant: startDependencies.data.nowProvider.get(),
          searchSessionId,
        })
      );
    }
  }, [
    attributesChanged,
    activeVisualization,
    datasourceMap,
    datasourceStates,
    framePublicAPI.dataViews.indexPatterns,
    framePublicAPI.dateRange,
    framePublicAPI.datasourceLayers,
    searchSessionId,
    startDependencies.data.nowProvider,
    visualization.activeId,
    visualization.state,
    getUserMessages,
  ]);

  const textBasedMode = isOfAggregateQueryType(query) ? getAggregateQueryMode(query) : undefined;

  if (isLoading) return null;
  // Example is the Discover editing where we dont want to render the text based editor on the panel, neither the suggestions (for now)
  if (!canEditTextBasedQuery && hidesSuggestions) {
    return (
      <FlyoutWrapper
        isInlineFlyoutVisible={isInlineFlyoutVisible}
        displayFlyoutHeader={displayFlyoutHeader}
        onCancel={onCancel}
        navigateToLensEditor={navigateToLensEditor}
        onApply={onApply}
        isScrollable
        isNewPanel={isNewPanel}
        isSaveable={isSaveable}
      >
        <LayerConfiguration
          // TODO: remove this once we support switching to any chart in Discover
          onlyAllowSwitchToSubtypes
          getUserMessages={getUserMessages}
          attributes={attributes}
          coreStart={coreStart}
          startDependencies={startDependencies}
          visualizationMap={visualizationMap}
          datasourceMap={datasourceMap}
          datasourceId={datasourceId}
          hasPadding
          framePublicAPI={framePublicAPI}
          setIsInlineFlyoutVisible={setIsInlineFlyoutVisible}
        />
      </FlyoutWrapper>
    );
  }

  return (
    <>
      <FlyoutWrapper
        isInlineFlyoutVisible={isInlineFlyoutVisible}
        displayFlyoutHeader={displayFlyoutHeader}
        onCancel={onCancel}
        navigateToLensEditor={navigateToLensEditor}
        onApply={onApply}
        language={textBasedMode ? getLanguageDisplayName(textBasedMode) : ''}
        isSaveable={isSaveable}
        isScrollable={false}
        isNewPanel={isNewPanel}
      >
        <EuiFlexGroup
          css={css`
            block-size: 100%;
            .euiFlexItem,
            .euiAccordion,
            .euiAccordion__triggerWrapper,
            .euiAccordion__childWrapper {
              min-block-size: 0;
            }
            .euiAccordion {
              display: flex;
              flex: 1;
              flex-direction: column;
            }
            .euiAccordion__childWrapper {
              overflow-y: auto !important;
              ${euiScrollBarStyles(euiTheme)}
              padding-left: ${euiThemeVars.euiFormMaxWidth};
              margin-left: -${euiThemeVars.euiFormMaxWidth};

              .euiAccordion-isOpen & {
                block-size: auto !important;
                flex: 1;
              }
            }
          `}
          direction="column"
          gutterSize="none"
        >
          {isOfAggregateQueryType(query) && canEditTextBasedQuery && (
            <EuiFlexItem grow={false} data-test-subj="InlineEditingESQLEditor">
              <TextBasedLangEditor
                query={query}
                onTextLangQueryChange={(q) => {
                  setQuery(q);
                  prevQuery.current = q;
                }}
                expandCodeEditor={(status: boolean) => {}}
                isCodeEditorExpanded
                detectTimestamp={Boolean(adHocDataViews?.[0]?.timeFieldName)}
                hideTimeFilterInfo={hideTimeFilterInfo}
                errors={errors}
                warning={
                  suggestsLimitedColumns
                    ? i18n.translate('xpack.lens.config.configFlyoutCallout', {
                        defaultMessage:
                          'Displaying a limited portion of the available fields. Add more from the configuration panel.',
                      })
                    : undefined
                }
                hideMinimizeButton
                editorIsInline
                hideRunQueryText
                onTextLangQuerySubmit={async (q, a) => {
                  if (q) {
                    setIsVisualizationLoading(true);
                    await runQuery(q, a);
                  }
                }}
                isDisabled={false}
                allowQueryCancellation
                isLoading={isVisualizationLoading}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem
            grow={isLayerAccordionOpen ? 1 : false}
            css={css`
                .euiAccordion__childWrapper {
                  flex: ${isLayerAccordionOpen ? 1 : 'none'}
                }
              }
            `}
          >
            <EuiAccordion
              css={css`
                .euiAccordion__triggerWrapper {
                  padding: 0 ${euiThemeVars.euiSize};
                }
              `}
              id="layer-configuration"
              buttonContent={
                <EuiTitle
                  size="xxs"
                  css={css`
                padding: 2px;
              }
            `}
                >
                  <h5>
                    {i18n.translate('xpack.lens.config.visualizationConfigurationLabel', {
                      defaultMessage: 'Visualization configuration',
                    })}
                  </h5>
                </EuiTitle>
              }
              buttonProps={{
                paddingSize: 'm',
              }}
              initialIsOpen={isLayerAccordionOpen}
              forceState={isLayerAccordionOpen ? 'open' : 'closed'}
              onToggle={(status) => {
                if (status && isSuggestionsAccordionOpen) {
                  setIsSuggestionsAccordionOpen(!status);
                }
                setIsLayerAccordionOpen(!isLayerAccordionOpen);
              }}
            >
              <>
                <LayerConfiguration
                  attributes={attributes}
                  getUserMessages={getUserMessages}
                  coreStart={coreStart}
                  startDependencies={startDependencies}
                  visualizationMap={visualizationMap}
                  datasourceMap={datasourceMap}
                  datasourceId={datasourceId}
                  framePublicAPI={framePublicAPI}
                  setIsInlineFlyoutVisible={setIsInlineFlyoutVisible}
                />
                <EuiSpacer />
              </>
            </EuiAccordion>
          </EuiFlexItem>

          <EuiFlexItem
            grow={isSuggestionsAccordionOpen ? 1 : false}
            data-test-subj="InlineEditingSuggestions"
            css={css`
                border-top: ${euiThemeVars.euiBorderThin};
                border-bottom: ${euiThemeVars.euiBorderThin};
                padding-left: ${euiThemeVars.euiSize};
                padding-right: ${euiThemeVars.euiSize};
                .euiAccordion__childWrapper {
                  flex: ${isSuggestionsAccordionOpen ? 1 : 'none'}
                }
              }
            `}
          >
            <SuggestionPanel
              ExpressionRenderer={startDependencies.expressions.ReactExpressionRenderer}
              datasourceMap={datasourceMap}
              visualizationMap={visualizationMap}
              frame={framePublicAPI}
              core={coreStart}
              nowProvider={startDependencies.data.nowProvider}
              showOnlyIcons
              wrapSuggestions
              isAccordionOpen={isSuggestionsAccordionOpen}
              toggleAccordionCb={(status) => {
                if (!status && isLayerAccordionOpen) {
                  setIsLayerAccordionOpen(status);
                }
                setIsSuggestionsAccordionOpen(!isSuggestionsAccordionOpen);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </FlyoutWrapper>
    </>
  );
}
