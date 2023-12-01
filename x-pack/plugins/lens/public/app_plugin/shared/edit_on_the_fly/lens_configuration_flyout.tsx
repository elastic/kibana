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
import { useLensSelector, selectFramePublicAPI } from '../../../state_management';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import { extractReferencesFromState } from '../../../utils';
import { LayerConfiguration } from './layer_configuration_section';
import type { EditConfigPanelProps } from './types';
import { FlyoutWrapper } from './flyout_wrapper';
import { getSuggestions } from './helpers';
import { SuggestionPanel } from '../../../editor_frame_service/editor_frame/suggestion_panel';

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
  onDeletePanel,
}: EditConfigPanelProps) {
  const euiTheme = useEuiTheme();
  const previousAttributes = useRef<TypedLensByValueInput['attributes']>(attributes);
  const prevQuery = useRef<AggregateQuery | Query>(attributes.state.query);
  const [query, setQuery] = useState<AggregateQuery | Query>(attributes.state.query);
  const [errors, setErrors] = useState<Error[] | undefined>();
  const [isInlineFlyoutVisible, setIsInlineFlyoutVisible] = useState(true);
  const [isLayerAccordionOpen, setIsLayerAccordionOpen] = useState(true);
  const [isSuggestionsAccordionOpen, setIsSuggestionsAccordionOpen] = useState(false);
  const datasourceState = attributes.state.datasourceStates[datasourceId];
  const activeVisualization = visualizationMap[attributes.visualizationType];
  const activeDatasource = datasourceMap[datasourceId];
  const { datasourceStates, visualization, isLoading } = useLensSelector((state) => state.lens);
  const suggestsLimitedColumns = activeDatasource?.suggestsLimitedColumns?.(datasourceState);
  const activeData: Record<string, Datatable> = useMemo(() => {
    return {};
  }, []);
  useEffect(() => {
    const s = output$?.subscribe(() => {
      const layers = activeDatasource.getLayers(datasourceState);
      const adaptersTables = lensAdapters?.tables?.tables as Record<string, Datatable>;
      const [table] = Object.values(adaptersTables || {});
      layers.forEach((layer) => {
        if (table) {
          activeData[layer] = table;
        }
      });
    });
    return () => s?.unsubscribe();
  }, [activeDatasource, lensAdapters, datasourceState, output$, activeData]);

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
    return (
      !isEqual(visualizationState, previousAttrs.state.visualization) || !datasourceStatesAreSame
    );
  }, [attributes.references, datasourceId, datasourceMap, datasourceStates, visualization.state]);

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
    if (isNewPanel && onDeletePanel && !attributesChanged) {
      onDeletePanel();
    }
    closeFlyout?.();
  }, [
    attributesChanged,
    isNewPanel,
    onDeletePanel,
    closeFlyout,
    visualization.activeId,
    savedObjectId,
    datasourceMap,
    datasourceId,
    updatePanelState,
    updateSuggestion,
    updateByRefInput,
  ]);

  const onApply = useCallback(() => {
    if (savedObjectId) {
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
      };
      saveByRef?.(attrs);
      updateByRefInput?.(savedObjectId);
    }
    closeFlyout?.();
  }, [
    savedObjectId,
    closeFlyout,
    datasourceStates,
    visualization.state,
    activeVisualization,
    attributes,
    saveByRef,
    updateByRefInput,
    datasourceMap,
  ]);

  // needed for text based languages mode which works ONLY with adHoc dataviews
  const adHocDataViews = Object.values(attributes.state.adHocDataViews ?? {});

  const runQuery = useCallback(
    async (q) => {
      const attrs = await getSuggestions(
        q,
        startDependencies,
        datasourceMap,
        visualizationMap,
        adHocDataViews,
        setErrors
      );
      if (attrs) {
        setCurrentAttributes?.(attrs);
        setErrors([]);
        updateSuggestion?.(attrs);
      }
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

  const framePublicAPI = useLensSelector((state) => {
    const newState = {
      ...state,
      lens: {
        ...state.lens,
        activeData,
      },
    };
    return selectFramePublicAPI(newState, datasourceMap);
  });

  const textBasedMode = isOfAggregateQueryType(query) ? getAggregateQueryMode(query) : undefined;

  if (isLoading) return null;
  // Example is the Discover editing where we dont want to render the text based editor on the panel
  if (!canEditTextBasedQuery) {
    return (
      <FlyoutWrapper
        isInlineFlyoutVisible={isInlineFlyoutVisible}
        displayFlyoutHeader={displayFlyoutHeader}
        onCancel={onCancel}
        navigateToLensEditor={navigateToLensEditor}
        onApply={onApply}
        isScrollable={true}
        attributesChanged={attributesChanged}
      >
        <LayerConfiguration
          attributes={attributes}
          coreStart={coreStart}
          startDependencies={startDependencies}
          visualizationMap={visualizationMap}
          datasourceMap={datasourceMap}
          datasourceId={datasourceId}
          hasPadding={true}
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
        attributesChanged={attributesChanged}
        language={getLanguageDisplayName(textBasedMode)}
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
          {isOfAggregateQueryType(query) && (
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
                disableSubmitAction={isEqual(query, prevQuery.current)}
                onTextLangQuerySubmit={(q) => {
                  if (q) {
                    runQuery(q);
                  }
                }}
                isDisabled={false}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem
            grow={isLayerAccordionOpen ? 1 : false}
            css={css`
                padding-left: ${euiThemeVars.euiSize};
                padding-right: ${euiThemeVars.euiSize};
                .euiAccordion__childWrapper {
                  flex: ${isLayerAccordionOpen ? 1 : 'none'}
                }
              }
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
                    {i18n.translate('xpack.lens.config.layerConfigurationLabel', {
                      defaultMessage: 'Layer configuration',
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
              <LayerConfiguration
                attributes={attributes}
                coreStart={coreStart}
                startDependencies={startDependencies}
                visualizationMap={visualizationMap}
                datasourceMap={datasourceMap}
                datasourceId={datasourceId}
                framePublicAPI={framePublicAPI}
                setIsInlineFlyoutVisible={setIsInlineFlyoutVisible}
              />
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
