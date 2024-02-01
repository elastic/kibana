/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { HttpSetup } from '@kbn/core/public';
import { EuiText } from '@elastic/eui';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { FieldBadge } from './field_badge';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { useCurrentEuiTheme } from '../../../common/hooks/use_current_eui_theme';
import { GrokHighlighter } from './grok_highlighter';

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

  const createLines = useMemo(
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
          const { matched, fields } = matches[index];
          if (matched === false) {
            return (
              <EuiText size="s" css={{ lineHeight: euiSizeL }}>
                <code>{line}</code>
              </EuiText>
            );
          }

          const sortedFields = Object.entries(fields)
            .map(([fieldName, [{ match, offset, length }]]) => {
              let type = mappings.properties[fieldName]?.type;

              if (type === undefined && fieldName === 'timestamp') {
                // it's possible that the timestamp field is not mapped as `timestamp`
                // but instead as `@timestamp`
                type = mappings.properties['@timestamp']?.type;
              }

              return {
                name: fieldName,
                match,
                offset,
                length,
                type,
              };
            })
            .sort((a, b) => a.offset - b.offset);
          // replace the original line with the matched fields
          const message: JSX.Element[] = [];
          let offset = 0;
          for (const field of sortedFields) {
            message.push(<span>{line.substring(offset, field.offset)}</span>);
            message.push(<FieldBadge type={field.type} value={field.match} name={field.name} />);
            offset = field.offset + field.length;
          }
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

  return createLines;
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
