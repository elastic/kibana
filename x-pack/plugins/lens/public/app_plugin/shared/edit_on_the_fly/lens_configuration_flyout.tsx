/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import { EuiFlyoutHeader, EuiTitle, EuiAccordion, EuiSpacer } from '@elastic/eui';
import { isOfAggregateQueryType, type AggregateQuery, type Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { useLensSelector } from '../../../state_management';

import type { Suggestion } from '../../../types';
import { suggestionsApi } from '../../../lens_suggestions_api';
import { fetchDataFromAggregateQuery } from '../../../datasources/text_based/fetch_data_from_aggregate_query';
import type { EditConfigPanelProps } from './types';
import { LayerConfiguration } from './layer_configuration';
import { FlyoutWrapper } from './flyout_wrapper';

export function LensEditConfigurationFlyout({
  attributes,
  coreStart,
  startDependencies,
  visualizationMap,
  datasourceMap,
  datasourceId,
  updateAll,
  dataView,
  closeFlyout,
  adaptersTables,
  canEditTextBasedQuery,
}: EditConfigPanelProps) {
  const query = attributes.state.query;
  const [queryTextBased, setQueryTextBased] = useState<AggregateQuery | Query>(query);
  const [suggestions, setSuggestions] = useState<Suggestion[]>();

  const runQuery = useCallback(
    async (q: AggregateQuery) => {
      setQueryTextBased(q);
      const table = await fetchDataFromAggregateQuery(
        q,
        dataView,
        startDependencies.data,
        startDependencies.expressions
      );

      const columns = table?.columns?.map(({ name }) => name);

      const context = {
        dataViewSpec: dataView?.toSpec(),
        fieldName: '',
        contextualFields: columns,
        query: q,
      };

      const allSuggestions =
        suggestionsApi({ context, dataView, datasourceMap, visualizationMap }) ?? [];

      setSuggestions(allSuggestions);
    },
    [
      dataView,
      datasourceMap,
      startDependencies.data,
      startDependencies.expressions,
      visualizationMap,
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
      {isOfAggregateQueryType(query) && (
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
          {isOfAggregateQueryType(queryTextBased) && (
            <TextBasedLangEditor
              query={queryTextBased}
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
