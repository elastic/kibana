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
import { EuiTitle, EuiAccordion, useEuiTheme } from '@elastic/eui';
import type { Datatable } from '@kbn/expressions-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { useLensSelector, selectFramePublicAPI } from '../../../state_management';
import type { TypedLensByValueInput } from '../../../embeddable/embeddable_component';
import { extractReferencesFromState } from '../../../utils';
import { LayerConfiguration } from './layer_configuration_section';
import type { EditConfigPanelProps } from './types';
import { FlyoutWrapper } from './flyout_wrapper';
import { getSuggestions } from './helpers';

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
  const datasourceState = attributes.state.datasourceStates[datasourceId];
  const activeVisualization = visualizationMap[attributes.visualizationType];
  const activeDatasource = datasourceMap[datasourceId];
  const [isInlineFooterVisible, setIsInlineFlyoutFooterVisible] = useState(true);
  const { datasourceStates, visualization, isLoading } = useLensSelector((state) => state.lens);
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

  const runQuery = useCallback(
    async (q) => {
      const attrs = await getSuggestions(q, startDependencies, datasourceMap, visualizationMap);
      if (attrs) {
        setCurrentAttributes?.(attrs);
        // previousAttributes.current = attrs;
        // setErrors([]);
        // updatePanelState?.(
        //   attrs.state.datasourceStates[datasourceId],
        //   attrs.state.visualization,
        //   attrs.visualizationType,
        //   attrs.state.query,
        //   attrs.title
        // );
        updateSuggestion?.(attrs);
      }
    },
    [
      // datasourceId,
      datasourceMap,
      startDependencies,
      updateSuggestion,
      visualizationMap,
      setCurrentAttributes,
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
        datasourceId={datasourceId}
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
        datasourceId={datasourceId}
        noPadding
      >
        <>
          {isOfAggregateQueryType(attributes.state.query) && (
            <TextBasedLangEditor
              query={attributes.state.query}
              onTextLangQueryChange={(q) => {
                // setQueryTextBased(q);
                // prevQuery.current = q;
              }}
              expandCodeEditor={(status: boolean) => {}}
              isCodeEditorExpanded
              // detectTimestamp={Boolean(dataView?.timeFieldName)}
              // errors={errors}
              hideMinimizeButton
              editorIsInline
              hideRunQueryText
              // disableSubmitAction={isEqual(queryTextBased, prevQuery.current)}
              onTextLangQuerySubmit={(q) => {
                if (q) {
                  runQuery(q);
                }
              }}
              isDisabled={false}
            />
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
        </>
      </FlyoutWrapper>
    </>
  );
}
