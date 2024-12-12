/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
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
  EuiWindowEvent,
  keys,
} from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import { DefaultInspectorAdapters } from '@kbn/expressions-plugin/common';
import type { TypedLensSerializedState } from '../../../react_embeddable/types';
import { buildExpression } from '../../../editor_frame_service/editor_frame/expression_helpers';
import { useLensSelector, selectFramePublicAPI, useLensDispatch } from '../../../state_management';
import {
  EXPRESSION_BUILD_ERROR_ID,
  extractReferencesFromState,
  getAbsoluteDateRange,
} from '../../../utils';
import { LayerConfiguration } from './layer_configuration_section';
import type { EditConfigPanelProps } from './types';
import { FlyoutWrapper } from './flyout_wrapper';
import { SuggestionPanel } from '../../../editor_frame_service/editor_frame/suggestion_panel';
import { useApplicationUserMessages } from '../../get_application_user_messages';
import { trackSaveUiCounterEvents } from '../../../lens_ui_telemetry';

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
  dataLoading$,
  lensAdapters,
  navigateToLensEditor,
  displayFlyoutHeader,
  canEditTextBasedQuery,
  isNewPanel,
  hidesSuggestions,
  onApply: onApplyCallback,
  onCancel: onCancelCallback,
  hideTimeFilterInfo,
}: EditConfigPanelProps) {
  const euiTheme = useEuiTheme();
  const previousAttributes = useRef<TypedLensSerializedState['attributes']>(attributes);
  const previousAdapters = useRef<Partial<DefaultInspectorAdapters> | undefined>(lensAdapters);
  const [isInlineFlyoutVisible, setIsInlineFlyoutVisible] = useState(true);
  const [isLayerAccordionOpen, setIsLayerAccordionOpen] = useState(true);
  const [isSuggestionsAccordionOpen, setIsSuggestionsAccordionOpen] = useState(false);
  const [isESQLResultsAccordionOpen, setIsESQLResultsAccordionOpen] = useState(false);
  const datasourceState = attributes.state.datasourceStates[datasourceId];
  const activeDatasource = datasourceMap[datasourceId];

  const { datasourceStates, visualization, isLoading, annotationGroups, searchSessionId } =
    useLensSelector((state) => state.lens);
  // use the latest activeId, but fallback to attributes
  const activeVisualization =
    visualizationMap[visualization.activeId ?? attributes.visualizationType];

  const framePublicAPI = useLensSelector((state) => selectFramePublicAPI(state, datasourceMap));

  framePublicAPI.absDateRange = getAbsoluteDateRange(
    startDependencies.data.query.timefilter.timefilter
  );

  const layers = useMemo(
    () => activeDatasource.getLayers(datasourceState),
    [activeDatasource, datasourceState]
  );

  // needed for text based languages mode which works ONLY with adHoc dataviews
  const dispatch = useLensDispatch();

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
    onCancelCallback?.();
    closeFlyout?.();
  }, [
    attributesChanged,
    closeFlyout,
    visualization.activeId,
    savedObjectId,
    datasourceMap,
    datasourceId,
    updatePanelState,
    updateSuggestion,
    updateByRefInput,
    onCancelCallback,
  ]);

  const onApply = useCallback(() => {
    if (visualization.activeId == null) {
      return;
    }
    const dsStates = Object.fromEntries(
      Object.entries(datasourceStates).map(([id, ds]) => {
        const dsState = ds.state;
        return [id, dsState];
      })
    );
    // as ES|QL queries are using adHoc dataviews, we don't want to pass references
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
    const attrs: TypedLensSerializedState['attributes'] = {
      ...attributes,
      state: {
        ...attributes.state,
        visualization: visualization.state,
        datasourceStates: dsStates,
      },
      references,
      visualizationType: visualization.activeId,
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
      trackSaveUiCounterEvents(telemetryEvents);
    }

    onApplyCallback?.(attrs);
    closeFlyout?.();
  }, [
    visualization.activeId,
    savedObjectId,
    closeFlyout,
    onApplyCallback,
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

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === keys.ESCAPE) {
      closeFlyout?.();
      setIsInlineFlyoutVisible(false);
    }
  };

  if (isLoading) return null;
  // Example is the Discover editing where we dont want to render the text based editor on the panel, neither the suggestions (for now)
  if (!canEditTextBasedQuery && hidesSuggestions) {
    return (
      <>
        {isInlineFlyoutVisible && <EuiWindowEvent event="keydown" handler={onKeyDown} />}
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
      </>
    );
  }

  return (
    <>
      {isInlineFlyoutVisible && <EuiWindowEvent event="keydown" handler={onKeyDown} />}
      <FlyoutWrapper
        isInlineFlyoutVisible={isInlineFlyoutVisible}
        displayFlyoutHeader={displayFlyoutHeader}
        onCancel={onCancel}
        navigateToLensEditor={navigateToLensEditor}
        onApply={onApply}
        language={''}
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
              ${euiScrollBarStyles(euiTheme)}
              overflow-y: auto !important;
              pointer-events: none;
              padding-left: ${euiThemeVars.euiFormMaxWidth};
              margin-left: -${euiThemeVars.euiFormMaxWidth};
              > * {
                pointer-events: auto;
              }

              .euiAccordion-isOpen & {
                block-size: auto !important;
                flex: 1;
              }
            }
            .lnsIndexPatternDimensionEditor-advancedOptions {
              .euiAccordion__childWrapper {
                flex: none;
                overflow: hidden !important;
              }
            }
          `}
          direction="column"
          gutterSize="none"
        >
          <EuiFlexItem
            grow={isLayerAccordionOpen ? 1 : false}
            css={css`
              .euiAccordion__childWrapper {
                flex: ${isLayerAccordionOpen ? 1 : 'none'};
              }
              padding: 0 ${euiThemeVars.euiSize};
            `}
          >
            <EuiAccordion
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
                if (status && isESQLResultsAccordionOpen) {
                  setIsESQLResultsAccordionOpen(!status);
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
                if (status && isESQLResultsAccordionOpen) {
                  setIsESQLResultsAccordionOpen(!status);
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
