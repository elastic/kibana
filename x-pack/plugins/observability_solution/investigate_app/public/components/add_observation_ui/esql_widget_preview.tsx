/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/css';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ESQLColumn, ESQLRow } from '@kbn/es-types';
import {
  createEsqlWidget,
  ESQL_WIDGET_NAME,
  GlobalWidgetParameters,
  InvestigateWidgetColumnSpan,
  InvestigateWidgetCreate,
  OnWidgetAdd,
} from '@kbn/investigate-plugin/public';
import type { Suggestion } from '@kbn/lens-plugin/public';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import React, { useEffect, useMemo, useState } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { getEsFilterFromOverrides } from '../../utils/get_es_filter_from_overrides';
import { getDateHistogramResults } from '../../widgets/esql_widget/get_date_histogram_results';
import { EsqlWidget } from '../../widgets/esql_widget/register_esql_widget';
import { ErrorMessage } from '../error_message';
import { SuggestVisualizationList } from '../suggest_visualization_list';

function getWidgetFromSuggestion({
  query,
  suggestion,
}: {
  query: string;
  suggestion: Suggestion;
}): InvestigateWidgetCreate {
  const makeItWide = suggestion.visualizationId !== 'lnsMetric';

  const makeItTall = suggestion.visualizationId !== 'lnsMetric';

  let rows = makeItTall ? 12 : 4;

  if (suggestion.visualizationId === 'lnsDatatable') {
    rows = 18;
  }

  return createEsqlWidget({
    title: suggestion.title,
    type: ESQL_WIDGET_NAME,
    parameters: {
      esql: query,
      suggestion,
    },
    columns: makeItWide ? InvestigateWidgetColumnSpan.Four : InvestigateWidgetColumnSpan.One,
    rows,
  });
}

function PreviewContainer({ children }: { children: React.ReactNode }) {
  return (
    <EuiFlexGroup
      direction="row"
      alignItems="center"
      justifyContent="center"
      className={css`
        padding: 24px 0px 24px 0px;
        width: 100%;
        overflow: auto;
        > div {
          width: 100%;
        }
      `}
    >
      {children}
    </EuiFlexGroup>
  );
}

export function EsqlWidgetPreview({
  esqlQuery,
  onWidgetAdd,
  timeRange,
}: {
  esqlQuery: string;
  onWidgetAdd: OnWidgetAdd;
} & GlobalWidgetParameters) {
  const {
    services: { esql },
  } = useKibana();

  const filter = useMemo(() => {
    return getEsFilterFromOverrides({
      timeRange,
    });
  }, [timeRange]);

  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | undefined>(undefined);

  const queryResult = useAbortableAsync(
    async ({ signal }) => {
      return await esql.queryWithMeta({ signal, query: esqlQuery, filter }).then((result) => {
        setSelectedSuggestion((prevSuggestion) => {
          const mostSimilarSuggestion =
            result.meta.suggestions.find(
              (suggestion) => suggestion.visualizationId === prevSuggestion?.visualizationId
            ) || result.meta.suggestions[0];
          return mostSimilarSuggestion;
        });
        return result;
      });
    },
    [esqlQuery, filter, esql]
  );

  const dateHistoResponse = useAbortableAsync(
    ({ signal }) => {
      if (!queryResult.value?.query?.values || queryResult.loading || !selectedSuggestion) {
        return undefined;
      }
      return getDateHistogramResults({
        columns: queryResult.value.query.columns,
        esql,
        filter,
        query: esqlQuery,
        signal,
        suggestion: selectedSuggestion,
        timeRange,
      });
    },
    [queryResult, esql, filter, esqlQuery, selectedSuggestion, timeRange]
  );

  const [displayedProps, setDisplayedProps] = useState<
    {
      error: Error | undefined;
      loading: boolean;
    } & (
      | {
          value: {
            columns: ESQLColumn[];
            values: ESQLRow[];
            allColumns?: ESQLColumn[];
            dataView: DataView;
            suggestions: Array<Suggestion & { id: string }>;
          };
        }
      | { value: undefined }
    )
  >({
    loading: true,
    value: undefined,
    error: undefined,
  });

  useEffect(() => {
    setDisplayedProps((prevDisplayedProps) => {
      if (queryResult.loading) {
        return {
          ...prevDisplayedProps,
          loading: true,
          error: undefined,
        };
      }

      return {
        error: queryResult.error,
        loading: queryResult.loading,
        value: queryResult.value
          ? {
              columns: queryResult.value.query.columns,
              values: queryResult.value.query.values,
              allColumns: queryResult.value.query.all_columns,
              dataView: queryResult.value.meta.dataView,
              suggestions: queryResult.value.meta.suggestions,
            }
          : undefined,
      };
    });
  }, [queryResult]);

  if (displayedProps.error) {
    return (
      <PreviewContainer>
        <ErrorMessage error={displayedProps.error} />
      </PreviewContainer>
    );
  }

  if (!displayedProps.value || !selectedSuggestion) {
    return (
      <PreviewContainer>
        <EuiLoadingSpinner />
      </PreviewContainer>
    );
  }

  return (
    <EuiFlexGroup direction="column">
      <EuiFlexItem grow={false}>
        <PreviewContainer>
          <EsqlWidget
            suggestion={selectedSuggestion}
            columns={displayedProps.value.columns}
            allColumns={displayedProps.value.allColumns}
            values={displayedProps.value.values}
            dataView={displayedProps.value.dataView}
            esqlQuery={esqlQuery}
            dateHistogramResults={dateHistoResponse.value}
          />
        </PreviewContainer>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <SuggestVisualizationList
          suggestions={displayedProps.value.suggestions}
          onSuggestionClick={(suggestion) => {
            onWidgetAdd(getWidgetFromSuggestion({ query: esqlQuery, suggestion }));
          }}
          loading={queryResult.loading}
          onMouseLeave={() => {}}
          onSuggestionRollOver={(suggestion) => {
            setSelectedSuggestion(suggestion);
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
