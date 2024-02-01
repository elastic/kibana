/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { EuiText } from '@elastic/eui';
import { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { FieldBadge } from './field_badge';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { useCurrentEuiTheme } from '../../../common/hooks/use_current_eui_theme';
import { GrokHighlighter } from './grok_highlighter';

export interface CreateDocsResponse {
  success: boolean;
  remainder: number;
  docs: ImportDocMessage[];
  error?: any;
}

export interface ImportDocMessage {
  message: string;
}

interface TestGrokPatternResponse {
  matches: Array<{
    matched: boolean;
    fields: Record<string, Array<{ match: string; offset: number; length: number }>>;
  }>;
}

export function useGrokHighlighter() {
  const {
    services: { http },
  } = useDataVisualizerKibana();
  const { euiSizeL } = useCurrentEuiTheme();

  const createDocs = useMemo(
    () =>
      async (
        text: string,
        grokPattern: string,
        mappings: FindFileStructureResponse['mappings'],
        ecsCompatibility: string | undefined,
        multilineStartPattern: string,
        excludeLinesPattern: string | undefined
      ) => {
        const grokHighlighter = new GrokHighlighter({ multilineStartPattern, excludeLinesPattern });
        const lines = await grokHighlighter.createLines(text);
        const matches = await testGrokPattern(http, lines, grokPattern, ecsCompatibility);

        const formattedDocs = lines.map((line, index) => {
          const match = matches[index];
          if (match.matched === false) {
            return (
              <EuiText size="s" css={{ lineHeight: euiSizeL }}>
                <code>{line}</code>
              </EuiText>
            );
          }

          const sortedFields = Object.entries(match.fields)
            .map(([fieldName, [value]]) => {
              let type = mappings.properties[fieldName]?.type ?? '';

              // @ts-expect-error type can be an empty string
              if (type === '' && fieldName === 'timestamp') {
                type = mappings.properties['@timestamp']?.type ?? '';
              }

              return {
                name: fieldName,
                match: value.match,
                offset: value.offset,
                length: value.length,
                type,
              };
            })
            .sort((a, b) => a.offset - b.offset);
          // replace the original line with the matched fields
          const message: JSX.Element[] = [];
          let offset = 0;
          sortedFields.forEach((field) => {
            message.push(<span>{line.substring(offset, field.offset)}</span>);
            message.push(<FieldBadge type={field.type} value={field.match} name={field.name} />);
            offset = field.offset + field.length;
          });
          message.push(<span>{line.substring(offset)}</span>);
          return (
            <EuiText size="s" css={{ lineHeight: euiSizeL }}>
              <code>{message}</code>
            </EuiText>
          );
        });
        return formattedDocs;
      },
    [euiSizeL, http]
  );

  return createDocs;
}

async function testGrokPattern(
  http: HttpSetup,
  lines: string[],
  grokPattern: string,
  ecsCompatibility: string | undefined
) {
  const { matches } = await http.fetch<TestGrokPatternResponse>(
    '/internal/data_visualizer/test_grok_pattern',
    {
      method: 'POST',
      version: '1',
      body: JSON.stringify({
        grokPattern,
        text: lines,
        ecsCompatibility,
      }),
    }
  );
  return matches;
}
