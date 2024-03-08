/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { FieldBadge } from './field_badge';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { useCurrentEuiTheme } from '../../../common/hooks/use_current_eui_theme';
import { GrokHighlighter } from './grok_highlighter';

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
        const grokHighlighter = new GrokHighlighter(
          { multilineStartPattern, excludeLinesPattern },
          http
        );
        const lines = await grokHighlighter.createLines(
          text,
          grokPattern,
          mappings,
          ecsCompatibility
        );

        return lines.map((line) => {
          const formattedWords: JSX.Element[] = [];
          for (const { word, field } of line) {
            if (field) {
              formattedWords.push(<FieldBadge type={field.type} value={word} name={field.name} />);
            } else {
              formattedWords.push(<span>{word}</span>);
            }
          }
          return (
            <EuiText
              size="s"
              css={{ lineHeight: euiSizeL }}
              data-test-subj="dataVisualizerHighlightedLine"
            >
              <code>{formattedWords}</code>
            </EuiText>
          );
        });
      },
    [euiSizeL, http]
  );

  return createLines;
}
