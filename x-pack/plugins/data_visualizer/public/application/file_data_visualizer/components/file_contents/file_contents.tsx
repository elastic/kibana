/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC, useEffect, useState } from 'react';

import { EuiTitle, EuiSpacer, EuiHorizontalRule } from '@elastic/eui';

import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { EDITOR_MODE, JsonEditor } from '../json_editor';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { useGrokHighlighter } from './use_text_parser';

interface Props {
  data: string;
  format: string;
  numberOfLines: number;
  semiStructureTextData: {
    grokPattern: string | undefined;
    multilineStartPattern: string | undefined;
    excludeLinesPattern: string | undefined;
    sampleStart: string;
    mappings: FindFileStructureResponse['mappings'];
    ecsCompatibility: string | undefined;
  } | null;
}

export const FileContents: FC<Props> = ({ data, format, numberOfLines, semiStructureTextData }) => {
  let mode = EDITOR_MODE.TEXT;
  if (format === EDITOR_MODE.JSON) {
    mode = EDITOR_MODE.JSON;
  }
  const [highlightedLines, setHighlightedLines] = useState<JSX.Element[] | null>(null);
  const grokHighlighter = useGrokHighlighter();

  const {
    services: { http },
  } = useDataVisualizerKibana();

  useEffect(() => {
    if (
      semiStructureTextData === null ||
      semiStructureTextData.multilineStartPattern === undefined ||
      semiStructureTextData.grokPattern === undefined
    ) {
      return;
    }
    const { grokPattern, multilineStartPattern, excludeLinesPattern, mappings, ecsCompatibility } =
      semiStructureTextData;

    grokHighlighter(
      data,
      grokPattern,
      mappings,
      ecsCompatibility,
      multilineStartPattern,
      excludeLinesPattern
    ).then((docs) => {
      setHighlightedLines(docs);
    });
  }, [http, format, data, semiStructureTextData, grokHighlighter]);

  const formattedData = limitByNumberOfLines(data, numberOfLines);

  return (
    <React.Fragment>
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.dataVisualizer.file.fileContents.fileContentsTitle"
            defaultMessage="File contents"
          />
        </h2>
      </EuiTitle>

      <div>
        <FormattedMessage
          id="xpack.dataVisualizer.file.fileContents.firstLinesDescription"
          defaultMessage="First {numberOfLines, plural, zero {# line} one {# line} other {# lines}}"
          values={{
            numberOfLines,
          }}
        />
      </div>

      <EuiSpacer size="s" />

      {highlightedLines === null ? (
        <JsonEditor mode={mode} readOnly={true} value={formattedData} height="200px" />
      ) : (
        <>
          {highlightedLines.map((line, i) => (
            <>
              {line}
              {i === highlightedLines.length - 1 ? null : <EuiHorizontalRule margin="s" />}
            </>
          ))}
        </>
      )}
    </React.Fragment>
  );
};

function limitByNumberOfLines(data: string, numberOfLines: number) {
  return data.split('\n').slice(0, numberOfLines).join('\n');
}
