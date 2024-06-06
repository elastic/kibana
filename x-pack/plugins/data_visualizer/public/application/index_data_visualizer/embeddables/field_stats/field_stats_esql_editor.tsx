/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, useState, useCallback } from 'react';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

const expandCodeEditor = (status: boolean) => {};

export const FieldStatsESQLEditor = ({ canEditTextBasedQuery = true, query, setQuery }) => {
  const prevQuery = useRef<AggregateQuery | Query>(query);
  const [isVisualizationLoading, setIsVisualizationLoading] = useState(false);

  const runQuery = useCallback(async (q, abortController) => {
    // const attrs = await getSuggestions(
    //   q,
    //   startDependencies,
    //   datasourceMap,
    //   visualizationMap,
    //   adHocDataViews,
    //   setErrors,
    //   abortController
    // );
    // if (attrs) {
    //   setCurrentAttributes?.(attrs);
    //   setErrors([]);
    //   updateSuggestion?.(attrs);
    // }
    setIsVisualizationLoading(false);
  }, []);

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
        // detectTimestamp={Boolean(adHocDataViews?.[0]?.timeFieldName)}
        // hideTimeFilterInfo={hideTimeFilterInfo}
        // errors={errors}
        hideMinimizeButton
        editorIsInline
        hideRunQueryText
        // onTextLangQuerySubmit={async (q, a) => {
        //   if (q) {
        //     setIsVisualizationLoading(true);
        //     await runQuery(q, a);
        //   }
        // }}
        isDisabled={false}
        allowQueryCancellation
        isLoading={isVisualizationLoading}
      />
    </EuiFlexItem>
  );
};
