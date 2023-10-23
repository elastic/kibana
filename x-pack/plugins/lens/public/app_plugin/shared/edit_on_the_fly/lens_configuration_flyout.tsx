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
import { EuiTitle, EuiAccordion, useEuiTheme, EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
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
}: EditConfigPanelProps) {
  const { euiTheme } = useEuiTheme();
  const previousAttributes = useRef<TypedLensByValueInput['attributes']>(attributes);
  const prevQuery = useRef<AggregateQuery | Query>(attributes.state.query);
  const [query, setQuery] = useState<AggregateQuery | Query>(attributes.state.query);
  const [errors, setErrors] = useState<Error[] | undefined>();
  const [isInlineFooterVisible, setIsInlineFlyoutFooterVisible] = useState(true);
  const datasourceState = attributes.state.datasourceStates[datasourceId];
  const activeVisualization = visualizationMap[attributes.visualizationType];
  const activeDatasource = datasourceMap[datasourceId];
  const { datasourceStates, visualization, isLoading } = useLensSelector((state) => state.lens);
  const displayCallout = activeDatasource?.suggestsLimitedColumns?.(datasourceState);
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
    closeFlyout?.();
  }, [
    previousAttributes,
    attributesChanged,
    closeFlyout,
    datasourceMap,
    datasourceId,
    updatePanelState,
    updateSuggestion,
    savedObjectId,
    updateByRefInput,
    visualization,
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
  if (isLoading) return null;
  // Example is the Discover editing where we dont want to render the text based editor on the panel
  if (!canEditTextBasedQuery) {
    return (
      <FlyoutWrapper
        attributesChanged={attributesChanged}
        isInlineFooterVisible={isInlineFooterVisible}
        displayFlyoutHeader={displayFlyoutHeader}
        onCancel={onCancel}
        navigateToLensEditor={navigateToLensEditor}
        onApply={onApply}
      >
        <LayerConfiguration
          attributes={attributes}
          coreStart={coreStart}
          startDependencies={startDependencies}
          visualizationMap={visualizationMap}
          datasourceMap={datasourceMap}
          datasourceId={datasourceId}
          framePublicAPI={framePublicAPI}
          setIsInlineFlyoutFooterVisible={setIsInlineFlyoutFooterVisible}
        />
      </FlyoutWrapper>
    );
  }

  return (
    <>
      <FlyoutWrapper
        attributesChanged={attributesChanged}
        isInlineFooterVisible={isInlineFooterVisible}
        displayFlyoutHeader={displayFlyoutHeader}
        onCancel={onCancel}
        navigateToLensEditor={navigateToLensEditor}
        onApply={onApply}
      >
        <>
          {isOfAggregateQueryType(query) && (
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
          )}
          {displayCallout && (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                size="s"
                title={i18n.translate('xpack.lens.config.configFlyoutCallout', {
                  defaultMessage:
                    'Displaying a limited portion of the available fields. Add more from the configuration panel.',
                })}
                iconType="iInCircle"
              />
              <EuiSpacer size="s" />
            </>
          )}
          <EuiAccordion
            id="layer-configuration"
            buttonContent={
              <EuiTitle size="xxs">
                <h5>
                  {i18n.translate('xpack.lens.config.layerConfigurationLabel', {
                    defaultMessage: 'Layer configuration',
                  })}
                </h5>
              </EuiTitle>
            }
            initialIsOpen={true}
            css={css`
              padding: ${euiTheme.size.s};
              border-bottom: ${euiTheme.border.thin};
              // styles needed to display extra drop targets that are outside of the config panel main area
              .euiAccordion__childWrapper {
                overflow: inherit;
              }
            `}
          >
            <LayerConfiguration
              attributes={attributes}
              coreStart={coreStart}
              startDependencies={startDependencies}
              visualizationMap={visualizationMap}
              datasourceMap={datasourceMap}
              datasourceId={datasourceId}
              framePublicAPI={framePublicAPI}
              setIsInlineFlyoutFooterVisible={setIsInlineFlyoutFooterVisible}
            />
          </EuiAccordion>
          <div
            css={css`
              padding: ${euiTheme.size.s};
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
            />
          </div>
        </>
      </FlyoutWrapper>
    </>
  );
}
