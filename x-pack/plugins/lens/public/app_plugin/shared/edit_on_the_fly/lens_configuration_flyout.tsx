/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { EuiFlyoutHeader, EuiTitle, EuiAccordion, EuiSpacer } from '@elastic/eui';
import {
  isOfAggregateQueryType,
  getIndexPatternFromSQLQuery,
  type AggregateQuery,
  // type Query,
} from '@kbn/es-query';
import { isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import type { Datatable, ReactExpressionRendererProps } from '@kbn/expressions-plugin/public';
import { useLensSelector, selectCurrentDatasourceStates } from '../../../state_management';
import type { Suggestion } from '../../../types';
import { suggestionsApi } from '../../../lens_suggestions_api';
import { fetchDataFromAggregateQuery } from '../../../datasources/text_based/fetch_data_from_aggregate_query';
import {
  preparePreviewExpression,
  SuggestionPreview,
} from '../../../editor_frame_service/editor_frame/suggestion_panel';
import type { EditConfigPanelProps } from './types';
import { LayerConfiguration } from './layer_configuration';
import { FlyoutWrapper } from './flyout_wrapper';
import { getLensAttributes } from './get_lens_attributes';
import { mapDataToColumns } from './map_to_columns';
import { useFramePublicApi } from './use_frame_public_api';

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
  const [suggestions, setSuggestions] = useState<Suggestion[]>();
  // const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion>();
  const [currentSelectedSuggestion, setCurrentSelectedSuggestion] = useState<number>(-1);
  const [dataTable, setDataTable] = useState<Datatable | undefined>();
  const [fetchFromAdapters, setFetchFromAdapters] = useState(true);

  useEffect(() => {
    if (
      fetchFromAdapters &&
      adaptersTables &&
      !isEqual(Object.values(adaptersTables)[0], dataTable)
    ) {
      setDataTable(Object.values(adaptersTables)[0]);
    }
  }, [adaptersTables, dataTable, fetchFromAdapters]);

  const frameApi = useFramePublicApi({
    attributes,
    datasourceId,
    datasourceMap,
    dataTable,
  });
  const currentDatasourceStates = useLensSelector(selectCurrentDatasourceStates);

  const runQuery = useCallback(
    async (q: AggregateQuery) => {
      let indexPattern = '';
      setFetchFromAdapters(false);
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
      const firstSuggestion = allSuggestions[0];
      setCurrentSelectedSuggestion(0);
      const attrs = getLensAttributes({
        filters: [],
        query: q,
        dataView: dv,
        suggestion: firstSuggestion,
      });
      if (table) {
        const activeDatasource = datasourceMap[datasourceId];
        const datasourceState = attrs.state.datasourceStates[datasourceId];
        const fields = activeDatasource?.getColumns?.(datasourceState) ?? [];
        const updatedTable = mapDataToColumns(table, fields);
        setDataTable(updatedTable);
      }
      updateAllAttributes?.(attrs);
      setCurrentAttributes?.(attrs);
      setSuggestions(allSuggestions);
    },
    [
      dataView,
      startDependencies.dataViews,
      startDependencies.data,
      startDependencies.expressions,
      datasourceMap,
      visualizationMap,
      updateAllAttributes,
      setCurrentAttributes,
      datasourceId,
    ]
  );

  const AutoRefreshExpressionRenderer = useMemo(() => {
    const ExpressionRendererComponent = startDependencies.expressions.ReactExpressionRenderer;
    return (props: ReactExpressionRendererProps) => <ExpressionRendererComponent {...props} />;
  }, [startDependencies.expressions.ReactExpressionRenderer]);

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
          framePublicAPI={frameApi}
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
              framePublicAPI={frameApi}
            />
          </EuiAccordion>
          <EuiSpacer />
          {suggestions && suggestions.length && (
            <EuiAccordion
              id="chart-suggestions"
              buttonContent={
                <EuiTitle size="xs">
                  <h5>
                    {i18n.translate('xpack.lens.config.chartSuggestionsLabel', {
                      defaultMessage: 'Suggestions',
                    })}
                  </h5>
                </EuiTitle>
              }
              initialIsOpen={true}
            >
              {suggestions.map((suggestion, index) => {
                return (
                  <SuggestionPreview
                    preview={{
                      expression: preparePreviewExpression(
                        suggestion,
                        visualizationMap[suggestion.visualizationId],
                        datasourceMap,
                        currentDatasourceStates,
                        frameApi,
                        startDependencies.data.nowProvider
                      ),
                      icon: suggestion.previewIcon,
                      title: suggestion.title,
                    }}
                    ExpressionRenderer={AutoRefreshExpressionRenderer}
                    key={index}
                    onSelect={() => {
                      setCurrentSelectedSuggestion(index);
                    }}
                    selected={index === currentSelectedSuggestion}
                  />
                );
              })}
            </EuiAccordion>
          )}
        </>
      </FlyoutWrapper>
    </>
  );
}
