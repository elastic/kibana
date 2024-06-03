/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { css } from '@emotion/css';
import { GlobalWidgetParameters, OnWidgetAdd } from '@kbn/investigate-plugin/public';
import { TextBasedLangEditor } from '@kbn/text-based-languages/public';
import React, { useState } from 'react';
import { EsqlWidgetPreview } from './esql_widget_preview';

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

type EsqlWidgetControlProps = {
  onWidgetAdd: OnWidgetAdd;
} & GlobalWidgetParameters;

export function EsqlWidgetControl({
  onWidgetAdd,
  filters,
  timeRange,
  query,
}: EsqlWidgetControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const [esqlQuery, setEsqlQuery] = useState('FROM *');

  const [submittedEsqlQuery, setSubmittedEsqlQuery] = useState(esqlQuery);

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EsqlWidgetPreview
          filters={filters}
          esqlQuery={submittedEsqlQuery}
          timeRange={timeRange}
          query={query}
          onWidgetAdd={onWidgetAdd}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false} className={editorContainerClassName}>
        <TextBasedLangEditor
          query={{ esql: esqlQuery }}
          onTextLangQueryChange={(nextQuery) => setEsqlQuery(nextQuery.esql)}
          onTextLangQuerySubmit={async (nextSubmittedQuery) => {
            setSubmittedEsqlQuery(nextSubmittedQuery?.esql ?? '');
          }}
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
  );
}
