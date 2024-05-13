/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { css } from '@emotion/css';
import type { GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import { ESQL_WIDGET_NAME } from '../../constants';
import type { RegisterWidgetOptions } from '../register_widgets';
import { useKibana } from '../../hooks/use_kibana';
import { getLensAttrsForSuggestion } from '../../utils/get_lens_attrs_for_suggestion';
import { getDatatableFromEsqlResponse } from '../../utils/get_data_table_from_esql_response';
import type { EsqlWidgetParameters } from './types';
import { getEsFilterFromOverrides } from '../../utils/get_es_filter_from_overrides';

const lensClassName = css`
  height: 100%;
`;

function EsqlWidget({ input }: { input: TypedLensByValueInput }) {
  const {
    dependencies: {
      start: { lens },
    },
  } = useKibana();

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
      } = parameters as EsqlWidgetParameters & GlobalWidgetParameters;

      const esql = await services.esql;

      const filter = getEsFilterFromOverrides({
        query,
        filters,
        timeRange,
      });

      const [meta, response] = await Promise.all([
        esql.meta({ query: esqlQuery, signal, filter }),
        esql.query({ query: esqlQuery, signal, filter }),
      ]);

      const suggestion = suggestionFromParameters || meta.suggestions[0];

      const input = getLensAttrsForSuggestion({
        suggestion,
        dataView: meta.dataView,
        query: esqlQuery,
        table: getDatatableFromEsqlResponse(response),
      });

      return {
        columns: response.columns,
        values: response.values,
        input,
      };
    },
    ({ widget }) => {
      return <EsqlWidget input={widget.data.input} />;
    }
  );
}
