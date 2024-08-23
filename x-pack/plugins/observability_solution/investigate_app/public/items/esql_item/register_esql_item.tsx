/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/css';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import { i18n } from '@kbn/i18n';
import { type GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import type { Suggestion } from '@kbn/lens-plugin/public';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import React, { useMemo } from 'react';
import { ErrorMessage } from '../../components/error_message';
import { useKibana } from '../../hooks/use_kibana';
import { getDatatableFromEsqlResponse } from '../../utils/get_data_table_from_esql_response';
import { getEsFilterFromOverrides } from '../../utils/get_es_filter_from_overrides';
import { getLensAttrsForSuggestion } from '../../utils/get_lens_attrs_for_suggestion';
import type { Options } from '../register_items';
import { getDateHistogramResults } from './get_date_histogram_results';

const lensClassName = css`
  height: 100%;
`;

interface Props {
  suggestion: Suggestion;
  dataView: DataView;
  esqlQuery: string;
  columns: ESQLSearchResponse['columns'];
  allColumns: ESQLSearchResponse['all_columns'];
  values: ESQLSearchResponse['values'];
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
  columns: ESQLSearchResponse['columns'];
  values: ESQLSearchResponse['values'];
  suggestion: Suggestion;
  dateHistoResponse?: {
    query: string;
    columns: ESQLSearchResponse['columns'];
    values: ESQLSearchResponse['values'];
    groupingExpression: string;
  };
}

export function EsqlWidget({
  suggestion,
  dataView,
  esqlQuery,
  columns,
  allColumns,
  values,
  dateHistogramResults,
}: Props) {
  const {
    dependencies: {
      start: { lens },
    },
  } = useKibana();

  const datatable = useMemo(() => {
    return getDatatableFromEsqlResponse({
      columns,
      values,
      all_columns: allColumns,
    });
  }, [columns, values, allColumns]);

  const input = useMemo(() => {
    return getLensAttrsForSuggestion({
      suggestion,
      dataView,
      query: esqlQuery,
      table: datatable,
    });
  }, [suggestion, dataView, esqlQuery, datatable]);

  const memoizedQueryObject = useMemo(() => {
    return { esql: esqlQuery };
  }, [esqlQuery]);

  const initialColumns = useMemo(() => {
    const timestampColumn = datatable.columns.find((column) => column.name === '@timestamp');
    const messageColumn = datatable.columns.find((column) => column.name === 'message');

    if (datatable.columns.length > 20 && timestampColumn && messageColumn) {
      const hasDataForBothColumns = datatable.rows.every((row) => {
        const timestampValue = row['@timestamp'];
        const messageValue = row.message;

        return timestampValue !== null && timestampValue !== undefined && !!messageValue;
      });

      if (hasDataForBothColumns) {
        return [timestampColumn, messageColumn];
      }
    }
    return datatable.columns;
  }, [datatable.columns, datatable.rows]);

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

  if (input.attributes.visualizationType === 'lnsDatatable') {
    let innerElement: React.ReactElement;
    if (previewInput.error) {
      innerElement = <ErrorMessage error={previewInput.error} />;
    } else if (previewInput.value) {
      innerElement = <lens.EmbeddableComponent {...previewInput.value} />;
    } else {
      innerElement = <EuiLoadingSpinner size="s" />;
    }
    return (
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem
          grow={false}
          className={css`
            > div {
              height: 128px;
            }
          `}
        >
          {innerElement}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ESQLDataGrid
            rows={values}
            columns={datatable.columns}
            dataView={dataView}
            query={memoizedQueryObject}
            flyoutType="overlay"
            initialColumns={initialColumns}
            initialRowHeight={1}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <EuiFlexItem
      grow={true}
      className={css`
        > div {
          height: 128px;
        }
      `}
    >
      <lens.EmbeddableComponent {...input} className={lensClassName} />
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
    type: 'esql',
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
        columns: mainResponse.query.columns,
        values: mainResponse.query.values,
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
          columns={data.columns}
          allColumns={undefined}
          values={data.values}
          suggestion={data.suggestion}
          esqlQuery={itemParams.esql}
          dateHistogramResults={data.dateHistoResponse}
        />
      );
    },
  });
}
