/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiMarkdownFormat,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
} from '@elastic/eui';
import React, { useMemo } from 'react';

import { InsightMarkdownParser } from './insight_markdown_parser';
import { getFieldMarkdownRenderer } from './field_markdown_renderer';

interface Props {
  disableActions?: boolean;
  markdown: string;
}

const InsightMarkdownFormatterComponent: React.FC<Props> = ({
  disableActions = false,
  markdown,
}) => {
  const insightParsingPluginList = useMemo(
    () => [...getDefaultEuiMarkdownParsingPlugins(), InsightMarkdownParser],
    []
  );

  const insightProcessingPluginList = useMemo(() => {
    const processingPluginList = getDefaultEuiMarkdownProcessingPlugins();
    processingPluginList[1][1].components.fieldPlugin = getFieldMarkdownRenderer(disableActions);

    return processingPluginList;
  }, [disableActions]);

  return (
    <EuiMarkdownFormat
      color="subdued"
      data-test-subj="insightMarkdownFormatter"
      parsingPluginList={insightParsingPluginList}
      processingPluginList={insightProcessingPluginList}
      textSize="xs"
    >
      {markdown}
    </EuiMarkdownFormat>
  );
};
InsightMarkdownFormatterComponent.displayName = 'InsightMarkdownFormatter';

export const InsightMarkdownFormatter = React.memo(InsightMarkdownFormatterComponent);
