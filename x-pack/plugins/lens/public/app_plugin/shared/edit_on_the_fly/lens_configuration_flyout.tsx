/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlyoutHeader, EuiTitle, EuiAccordion, EuiSpacer } from '@elastic/eui';
import {
  isOfAggregateQueryType,
  getIndexPatternFromSQLQuery,
  type AggregateQuery,
  // type Query,
} from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { useLensSelector } from '../../../state_management';
// import type { Suggestion } from '../../../types';
import { suggestionsApi } from '../../../lens_suggestions_api';
import { fetchDataFromAggregateQuery } from '../../../datasources/text_based/fetch_data_from_aggregate_query';
import type { EditConfigPanelProps } from './types';
import { LayerConfiguration } from './layer_configuration';
import { FlyoutWrapper } from './flyout_wrapper';
import { getLensAttributes } from './get_lens_attributes';

export function LensEditConfigurationFlyout({
  attributes,
  coreStart,
  startDependencies,
  visualizationMap,
  datasourceMap,
  datasourceId,
  updateAllAttributes,
  setCurrentAttributes,
  dataView,
  closeFlyout,
  adaptersTables,
  canEditTextBasedQuery,
}: EditConfigPanelProps) {
  // const [queryTextBased, setQueryTextBased] = useState<AggregateQuery | Query>(query);
  // const [suggestions, setSuggestions] = useState<Suggestion[]>();

  const runQuery = useCallback(
    async (q: AggregateQuery) => {
      // setQueryTextBased(q);
      let indexPattern = '';
      if ('sql' in q) {
        indexPattern = getIndexPatternFromSQLQuery(q.sql);
      }
      const dv =
        indexPattern && indexPattern !== dataView.name
          ? await startDependencies.dataViews.create({
              title: indexPattern,
            })
          : dataView;
      const table = await fetchDataFromAggregateQuery(
        q,
        dv,
        startDependencies.data,
        startDependencies.expressions
      );

      const columns = table?.columns?.map(({ name }) => name);

      const context = {
        dataViewSpec: dv?.toSpec(),
        fieldName: '',
        contextualFields: columns,
        query: q,
      };

      const allSuggestions =
        suggestionsApi({ context, dataView, datasourceMap, visualizationMap }) ?? [];
      const currentSuggestion = allSuggestions[0];
      const attrs = getLensAttributes({
        filters: [],
        query: q,
        dataView: dv,
        suggestion: currentSuggestion,
      });
      updateAllAttributes?.(attrs);
      setCurrentAttributes?.(attrs);
      // setSuggestions(allSuggestions);
    },
    [
      dataView,
      datasourceMap,
      startDependencies.data,
      startDependencies.dataViews,
      startDependencies.expressions,
      visualizationMap,
      updateAllAttributes,
      setCurrentAttributes,
    ]
  );

  const { isLoading } = useLensSelector((state) => state.lens);
  if (isLoading) return null;

  // Example is the Discover editing where we dont want to render the text based editor on the panel
  if (!canEditTextBasedQuery) {
    return (
      <FlyoutWrapper datasourceId={datasourceId} closeFlyout={closeFlyout}>
        <LayerConfiguration
          attributes={attributes}
          coreStart={coreStart}
          startDependencies={startDependencies}
          visualizationMap={visualizationMap}
          datasourceMap={datasourceMap}
          datasourceId={datasourceId}
          adaptersTables={adaptersTables}
        />
      </FlyoutWrapper>
    );
  }

  return (
    <>
      {isOfAggregateQueryType(attributes.state.query) && (
        <EuiFlyoutHeader hasBorder className="lnsDimensionContainer__header">
          <EuiTitle size="xs">
            <h2 id="Edit Lens configuration">
              {i18n.translate('xpack.lens.config.editLabel', {
                defaultMessage: 'Edit SQL visualization',
              })}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
      )}
      <FlyoutWrapper datasourceId={datasourceId} closeFlyout={closeFlyout}>
        <>
          {isOfAggregateQueryType(attributes.state.query) && (
            <TextBasedLangEditor
              query={attributes.state.query}
              onTextLangQueryChange={(q) => {}}
              expandCodeEditor={(status: boolean) => {}}
              isCodeEditorExpanded={true}
              detectTimestamp={Boolean(dataView?.timeFieldName)}
              errors={[]}
              hideExpandButton={true}
              renderRunButton={true}
              onTextLangQuerySubmit={(q) => {
                if (q) {
                  runQuery(q);
                }
              }}
              isDisabled={false}
            />
          )}
          <EuiSpacer />
          <EuiAccordion
            id="layer-configuration"
            buttonContent={
              <EuiTitle size="xs">
                <h5>
                  {i18n.translate('xpack.lens.config.layerConfigurationLabel', {
                    defaultMessage: 'Layer configuration',
                  })}
                </h5>
              </EuiTitle>
            }
            initialIsOpen={true}
          >
            <LayerConfiguration
              attributes={attributes}
              coreStart={coreStart}
              startDependencies={startDependencies}
              visualizationMap={visualizationMap}
              datasourceMap={datasourceMap}
              datasourceId={datasourceId}
              adaptersTables={adaptersTables}
            />
          </EuiAccordion>
        </>
      </FlyoutWrapper>
    </>
  );
}
