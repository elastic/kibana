/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/css';
import {
  createEsqlWidget,
  InvestigateWidgetColumnSpan,
  InvestigateWidgetCreate,
} from '@kbn/investigate-plugin/public';
import { Suggestion } from '@kbn/lens-plugin/public';
import { useAbortableAsync } from '@kbn/observability-ai-assistant-plugin/public';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import React, { useMemo, useState } from 'react';
import type { Filter, Query } from '@kbn/es-query';
import { ESQL_WIDGET_NAME } from '../../constants';
import { useKibana } from '../../hooks/use_kibana';
import { getDatatableFromEsqlResponse } from '../../utils/get_data_table_from_esql_response';
import { getLensAttrsForSuggestion } from '../../utils/get_lens_attrs_for_suggestion';
import { PreviewLensSuggestion } from '../preview_lens_suggestion';
import { SuggestVisualizationList } from '../suggest_visualization_list';
import { getEsFilterFromOverrides } from '../../utils/get_es_filter_from_overrides';

const editorContainerClassName = css`
  .kibanaCodeEditor {
    width: 100%;
  }

  .monaco-editor {
    position: absolute !important;
  }
  > div {
    margin: 0;
  }
`;

const wrapperClassName = css`
  position: relative;
  width: 100%;
`;

const previewClassName = css`
  position: absolute;
  height: 320px;
  width: 640px;
  top: -339px;
  left: 8px;
`;

interface EsqlWidgetControlProps {
  onWidgetAdd: (widget: InvestigateWidgetCreate) => Promise<void>;
  filters: Filter[];
  timeRange: {
    from: string;
    to: string;
  };
  query: Query;
}

function getWidgetFromSuggestion({
  query,
  suggestion,
}: {
  query: string;
  suggestion: Suggestion;
}): InvestigateWidgetCreate {
  const makeItWide = suggestion.visualizationId !== 'lnsMetric';

  const makeItTall = suggestion.visualizationId !== 'lnsMetric';

  return createEsqlWidget({
    title: suggestion.title,
    type: ESQL_WIDGET_NAME,
    parameters: {
      esql: query,
      suggestion,
    },
    columns: makeItWide ? InvestigateWidgetColumnSpan.Four : InvestigateWidgetColumnSpan.One,
    rows: makeItTall ? 12 : 4,
    locked: false,
  });
}

export function EsqlWidgetControl({
  onWidgetAdd,
  filters,
  timeRange,
  query: kibanaContextQuery,
}: EsqlWidgetControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const [highlightedSuggestion, setHighlightedSuggestion] = useState<Suggestion>();

  const {
    services: { esql },
  } = useKibana();

  const [query, setQuery] = useState('FROM *');

  const filter = useMemo(() => {
    return getEsFilterFromOverrides({
      filters,
      timeRange,
      query: kibanaContextQuery,
    });
  }, [filters, timeRange, kibanaContextQuery]);

  const metaResult = useAbortableAsync(
    async ({ signal }) => {
      const meta = await esql.meta({ signal, query, filter });
      return meta;
    },
    [query, esql, filter]
  );

  const queryResult = useAbortableAsync(
    async ({ signal }) => {
      const results = await esql.query({ signal, query, filter });
      return results;
    },
    [query, esql, filter]
  );

  const highlightedInput = useMemo(() => {
    if (
      !highlightedSuggestion ||
      !queryResult.value ||
      queryResult.loading ||
      !metaResult.value ||
      metaResult.loading
    ) {
      return undefined;
    }
    const input = getLensAttrsForSuggestion({
      query,
      dataView: metaResult.value.dataView,
      suggestion: highlightedSuggestion,
      table: getDatatableFromEsqlResponse(queryResult.value),
    });

    return input;
  }, [
    queryResult.value,
    queryResult.loading,
    metaResult.value,
    metaResult.loading,
    query,
    highlightedSuggestion,
  ]);

  const suggestions = metaResult.value?.suggestions;

  return (
    <div className={wrapperClassName}>
      {!!highlightedInput && (
        <div className={previewClassName}>
          <PreviewLensSuggestion
            input={highlightedInput}
            loading={queryResult.loading || metaResult.loading}
          />
        </div>
      )}
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <SuggestVisualizationList
            suggestions={suggestions}
            loading={metaResult.loading}
            error={metaResult.error}
            onSuggestionClick={(suggestion) => {
              setHighlightedSuggestion(() => undefined);
              onWidgetAdd(getWidgetFromSuggestion({ suggestion, query }));
            }}
            onSuggestionRollOver={(suggestion) => {
              setHighlightedSuggestion(() => suggestion);
            }}
            onMouseLeave={() => {
              setHighlightedSuggestion(() => undefined);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className={editorContainerClassName}>
          <TextBasedLangEditor
            query={{ esql: query }}
            onTextLangQueryChange={(nextQuery) => setQuery(nextQuery.esql)}
            onTextLangQuerySubmit={async (submittedQuery) => {}}
            errors={undefined}
            warning={undefined}
            expandCodeEditor={(expanded: boolean) => {
              setIsExpanded(() => expanded);
            }}
            isCodeEditorExpanded={isExpanded}
            hideMinimizeButton={false}
            editorIsInline
            hideRunQueryText
            isLoading={false}
            disableSubmitAction
            isDisabled={false}
            hideQueryHistory
            hideTimeFilterInfo
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
