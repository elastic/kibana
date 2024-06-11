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
import { ESQL_WIDGET_NAME } from '../../constants';
import type { RegisterWidgetOptions } from '../register_widgets';
import { useKibana } from '../../hooks/use_kibana';
import { getLensAttrsForSuggestion } from '../../utils/get_lens_attrs_for_suggestion';
import { getDatatableFromEsqlResponse } from '../../utils/get_data_table_from_esql_response';
import { getEsFilterFromOverrides } from '../../utils/get_es_filter_from_overrides';

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
}: {
  suggestion: Suggestion;
  dataView: DataView;
  esqlQuery: string;
  columns: ESQLSearchResponse['columns'];
  allColumns: ESQLSearchResponse['all_columns'];
  values: ESQLSearchResponse['values'];
  blocks: WidgetRenderAPI['blocks'];
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

  if (input.attributes.visualizationType === 'lnsDatatable') {
    return (
      <ESQLDataGrid
        rows={values}
        columns={datatable.columns}
        dataView={dataView}
        query={memoizedQueryObject}
        flyoutType="overlay"
        initialColumns={initialColumns}
      />
    );
  }

  return <lens.EmbeddableComponent {...input} className={lensClassName} />;
}

export function registerEsqlWidget({
  dependencies: {
    setup: { investigate },
  },
  services,
}: RegisterWidgetOptions) {
  investigate.registerWidget(
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
        predefined,
      } = parameters as EsqlWidgetParameters & GlobalWidgetParameters;

      const esql = await services.esql;

      const esFilters = [
        getEsFilterFromOverrides({
          query,
          filters,
          timeRange,
        }),
        ...(predefined
          ? [
              getEsFilterFromOverrides({
                filters: predefined.filters,
                query: predefined.query,
              }),
            ]
          : []),
      ];

      const filter = {
        bool: {
          filter: [...esFilters],
        },
      };

      const [meta, response] = await Promise.all([
        esql.meta({ query: esqlQuery, signal, filter }),
        esql.query({ query: esqlQuery, signal, filter }),
      ]);

      const suggestion = suggestionFromParameters || meta.suggestions[0];

      return {
        columns: response.columns,
        values: response.values,
        suggestion,
        dataView: meta.dataView,
      };
    },
    ({ widget, blocks }) => {
      const { dataView, columns, values, suggestion } = widget.data;
      return (
        <EsqlWidget
          dataView={dataView}
          columns={columns}
          allColumns={undefined}
          values={values}
          suggestion={suggestion}
          esqlQuery={widget.parameters.esql}
          blocks={blocks}
        />
      );
    }
  );
}
