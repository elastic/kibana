/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, useState, useCallback } from 'react';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { EuiFlexItem } from '@elastic/eui';
import type { AggregateQuery } from '@kbn/es-query';

const expandCodeEditor = (status: boolean) => {};

interface FieldStatsESQLEditorProps {
  canEditTextBasedQuery?: boolean;
  query: AggregateQuery;
  setQuery: (query: AggregateQuery) => void;
  onQuerySubmit: (query: AggregateQuery, abortController: AbortController) => Promise<void>;
}
export const FieldStatsESQLEditor = ({
  canEditTextBasedQuery = true,
  query,
  setQuery,
  onQuerySubmit,
}: FieldStatsESQLEditorProps) => {
  const prevQuery = useRef<AggregateQuery>(query);
  const [isVisualizationLoading, setIsVisualizationLoading] = useState(false);

  const onTextLangQuerySubmit = useCallback(
    async (q, abortController) => {
      if (q && onQuerySubmit) {
        setIsVisualizationLoading(true);
        await onQuerySubmit(q, abortController);
        setIsVisualizationLoading(false);
      }
    },
    [onQuerySubmit]
  );

  if (!canEditTextBasedQuery) return null;

  return (
    <EuiFlexItem grow={false} data-test-subj="InlineEditingESQLEditor">
      <TextBasedLangEditor
        query={query}
        onTextLangQueryChange={(q) => {
          setQuery(q);
          prevQuery.current = q;
        }}
        expandCodeEditor={expandCodeEditor}
        isCodeEditorExpanded
        hideMinimizeButton
        editorIsInline
        hideRunQueryText
        onTextLangQuerySubmit={onTextLangQuerySubmit}
        isDisabled={false}
        allowQueryCancellation
        isLoading={isVisualizationLoading}
      />
    </EuiFlexItem>
  );
};
