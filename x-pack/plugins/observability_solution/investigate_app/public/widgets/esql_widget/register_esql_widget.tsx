/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo } from 'react';
import type { Suggestion } from '@kbn/lens-plugin/public';
import { css } from '@emotion/css';
import type {
  EsqlWidgetParameters,
  GlobalWidgetParameters,
  WidgetRenderAPI,
} from '@kbn/investigate-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { ESQLDataGrid } from '@kbn/esql-datagrid/public';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { ESQL_WIDGET_NAME } from '../../constants';
import type { RegisterWidgetOptions } from '../register_widgets';
import { useKibana } from '../../hooks/use_kibana';
import { getLensAttrsForSuggestion } from '../../utils/get_lens_attrs_for_suggestion';
import { getDatatableFromEsqlResponse } from '../../utils/get_data_table_from_esql_response';
import { getEsFilterFromOverrides } from '../../utils/get_es_filter_from_overrides';
import { ErrorMessage } from '../../components/error_message';
import { getDateHistogramResults } from './get_date_histogram_results';

const lensClassName = css`
  height: 100%;
`;

export function EsqlWidget({
  suggestion,
  dataView,
  esqlQuery,
  columns,
  allColumns,
  values,
  blocks,
  dateHistogramResults,
}: {
  suggestion: Suggestion;
  dataView: DataView;
  esqlQuery: string;
  columns: ESQLSearchResponse['columns'];
  allColumns: ESQLSearchResponse['all_columns'];
  values: ESQLSearchResponse['values'];
  blocks: WidgetRenderAPI['blocks'];
  dateHistogramResults?: {
    query: string;
    columns: ESQLSearchResponse['columns'];
    values: ESQLSearchResponse['values'];
    groupingExpression: string;
  };
}) {
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

  useEffect(() => {
    if (datatable.columns.find((column) => column.name === 'message')) {
      return blocks.publish([
        {
          id: 'pattern_analysis',
          loading: false,
          content: i18n.translate('xpack.investigateApp.esqlWidget.runPatternAnalysis', {
            defaultMessage: 'Analyze log patterns',
          }),
        },
      ]);
    }
  }, [blocks, datatable]);

  const initialColumns = useMemo(() => {
    const timestampColumn = datatable.columns.find((column) => column.name === '@timestamp');
    const messageColumn = datatable.columns.find((column) => column.name === 'message');

    if (datatable.columns.length > 10 && timestampColumn && messageColumn) {
      const hasDataForBothColumns = datatable.rows.every((row) => {
        const timestampValue = row['@timestamp'];
        const messageValue = row.message;

        return timestampValue !== null && timestampValue !== undefined && !!messageValue;
      });

      if (hasDataForBothColumns) {
        return [timestampColumn, messageColumn];
      }
    }
    return undefined;
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
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <lens.EmbeddableComponent {...input} className={lensClassName} />;
}

export function registerEsqlWidget({
  dependencies: {
    setup: { investigate },
  },
  services,
  registerWidget,
}: RegisterWidgetOptions) {
  registerWidget(
    {
      type: ESQL_WIDGET_NAME,
      description: 'Visualize an ES|QL query',
      schema: {
        type: 'object',
        properties: {
          esql: {
            description: 'The ES|QL query',
            type: 'string',
          },
        },
        required: ['esql'],
      } as const,
    },
    async ({ parameters, signal }) => {
      const {
        esql: esqlQuery,
        query,
        filters,
        timeRange,
        suggestion: suggestionFromParameters,
      } = parameters as EsqlWidgetParameters & GlobalWidgetParameters;

      const esql = await services.esql;

      const esFilters = [
        getEsFilterFromOverrides({
          query,
          filters,
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
        signal,
        filter: getFilter(),
      });

      const suggestion = suggestionFromParameters || mainResponse.meta.suggestions[0];

      const dateHistoResponse = await getDateHistogramResults({
        query: esqlQuery,
        columns: mainResponse.query.columns,
        esql,
        filter: getFilter(),
        signal,
        suggestion,
        timeRange,
      });

      return {
        main: {
          columns: mainResponse.query.columns,
          values: mainResponse.query.values,
          suggestion,
          dataView: mainResponse.meta.dataView,
        },
        dateHistogram: dateHistoResponse,
      };
    },
    ({ widget, blocks }) => {
      const {
        main: { dataView, columns, values, suggestion },
        dateHistogram,
      } = widget.data;
      return (
        <EsqlWidget
          dataView={dataView}
          columns={columns}
          allColumns={undefined}
          values={values}
          suggestion={suggestion}
          esqlQuery={widget.parameters.esql}
          blocks={blocks}
          dateHistogramResults={dateHistogram}
        />
      );
    }
  );
}
