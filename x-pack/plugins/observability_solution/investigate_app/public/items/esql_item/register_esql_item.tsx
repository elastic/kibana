/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { i18n } from '@kbn/i18n';
import { type GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import type { Suggestion } from '@kbn/lens-plugin/public';
import { useAbortableAsync } from '@kbn/observability-utils-browser/hooks/use_abortable_async';
import React, { useMemo } from 'react';
import { ErrorMessage } from '../../components/error_message';
import { useKibana } from '../../hooks/use_kibana';
import { getDatatableFromEsqlResponse } from '../../utils/get_data_table_from_esql_response';
import { getEsFilterFromOverrides } from '../../utils/get_es_filter_from_overrides';
import { getLensAttrsForSuggestion } from '../../utils/get_lens_attrs_for_suggestion';
import type { Options } from '../register_items';
import { getDateHistogramResults } from './get_date_histogram_results';

interface Props {
  suggestion: Suggestion;
  dataView: DataView;
  esqlQuery: string;
  dateHistogramResults?: {
    query: string;
    columns: ESQLSearchResponse['columns'];
    values: ESQLSearchResponse['values'];
    groupingExpression: string;
  };
}

interface EsqlItemParams {
  esql: string;
  suggestion?: Suggestion;
}

interface EsqlItemData {
  dataView: DataView;
  suggestion: Suggestion;
  dateHistoResponse?: {
    query: string;
    columns: ESQLSearchResponse['columns'];
    values: ESQLSearchResponse['values'];
    groupingExpression: string;
  };
}

export const ESQL_ITEM_TYPE = 'esql';

export function EsqlWidget({ suggestion, dataView, esqlQuery, dateHistogramResults }: Props) {
  const {
    dependencies: {
      start: { lens },
    },
  } = useKibana();

  const input = useMemo(() => {
    return getLensAttrsForSuggestion({
      suggestion,
      dataView,
      query: esqlQuery,
    });
  }, [suggestion, dataView, esqlQuery]);

  const previewInput = useAbortableAsync(
    async ({ signal }) => {
      if (!dateHistogramResults) {
        return undefined;
      }

      const lensHelper = await lens.stateHelperApi();

      const suggestionsFromLensHelper = await lensHelper.suggestions(
        {
          dataViewSpec: dataView.toSpec(),
          fieldName: '',
          textBasedColumns: [
            {
              id: dateHistogramResults.groupingExpression,
              name: i18n.translate('xpack.investigateApp.esqlWidget.groupedByDateLabel', {
                defaultMessage: '@timestamp',
              }),
              meta: {
                type: 'date',
              },
            },
            {
              id: 'count',
              name: 'count',
              meta: {
                type: 'number',
              },
            },
          ],
          query: {
            esql: dateHistogramResults.query,
          },
        },
        dataView,
        ['lnsDatatable']
      );

      const suggestionForHistogram = suggestionsFromLensHelper?.[0];

      if (!suggestionForHistogram) {
        return undefined;
      }

      return getLensAttrsForSuggestion({
        suggestion: suggestionForHistogram,
        dataView,
        query: dateHistogramResults.query,
        table: getDatatableFromEsqlResponse({
          columns: dateHistogramResults.columns,
          values: dateHistogramResults.values,
        }),
      });
    },
    [dataView, lens, dateHistogramResults]
  );

  // in the case of a lnsDatatable, we want to render the preview of the histogram and not the datable (input) itself
  if (input.attributes.visualizationType === 'lnsDatatable') {
    let innerElement: React.ReactElement;
    if (previewInput.error) {
      innerElement = <ErrorMessage error={previewInput.error} />;
    } else if (previewInput.value) {
      innerElement = (
        <lens.EmbeddableComponent
          {...previewInput.value}
          style={{ height: 128 }}
          overrides={{
            axisX: { hide: true },
            axisLeft: { style: { axisTitle: { visible: false } } },
            settings: { showLegend: false },
          }}
        />
      );
    } else {
      innerElement = <EuiLoadingSpinner size="s" />;
    }

    return <EuiFlexItem grow={true}>{innerElement}</EuiFlexItem>;
  }

  return (
    <EuiFlexItem grow={true}>
      <lens.EmbeddableComponent
        {...input}
        style={{ height: 128 }}
        overrides={{
          axisX: { hide: true },
          axisLeft: { style: { axisTitle: { visible: false } } },
          settings: { showLegend: false },
        }}
      />
    </EuiFlexItem>
  );
}

export function registerEsqlItem({
  dependencies: {
    setup: { investigate },
  },
  services,
}: Options) {
  investigate.registerItemDefinition<EsqlItemParams, EsqlItemData>({
    type: ESQL_ITEM_TYPE,
    generate: async (option: {
      itemParams: EsqlItemParams;
      globalParams: GlobalWidgetParameters;
    }) => {
      const controller = new AbortController();
      const { esql: esqlQuery, suggestion: suggestionFromParameters } = option.itemParams;
      const { timeRange } = option.globalParams;

      const esql = await services.esql;

      const esFilters = [
        getEsFilterFromOverrides({
          timeRange,
        }),
      ];

      const getFilter = () => ({
        bool: {
          filter: [...esFilters],
        },
      });

      const mainResponse = await esql.queryWithMeta({
        query: esqlQuery,
        signal: controller.signal,
        filter: getFilter(),
      });

      const suggestion = suggestionFromParameters || mainResponse.meta.suggestions[0];

      const dateHistoResponse = await getDateHistogramResults({
        query: esqlQuery,
        columns: mainResponse.query.columns,
        esql,
        filter: getFilter(),
        signal: controller.signal,
        suggestion,
        timeRange,
      });

      return {
        dataView: mainResponse.meta.dataView,
        suggestion,
        dateHistoResponse,
      };
    },
    render: (option: {
      itemParams: EsqlItemParams;
      globalParams: GlobalWidgetParameters;
      data: EsqlItemData;
    }) => {
      const { itemParams, data } = option;
      return (
        <EsqlWidget
          dataView={data.dataView}
          suggestion={data.suggestion}
          esqlQuery={itemParams.esql}
          dateHistogramResults={data.dateHistoResponse}
        />
      );
    },
  });
}
