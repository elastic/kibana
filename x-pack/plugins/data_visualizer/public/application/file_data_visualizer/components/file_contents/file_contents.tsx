/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useEffect, useState, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiTitle,
  EuiSpacer,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
} from '@elastic/eui';

import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import useMountedState from 'react-use/lib/useMountedState';
import { i18n } from '@kbn/i18n';
import { EDITOR_MODE, JsonEditor } from '../json_editor';
import { useGrokHighlighter } from './use_text_parser';
import { LINE_LIMIT } from './grok_highlighter';

interface Props {
  data: string;
  format: string;
  numberOfLines: number;
  semiStructureTextData: SemiStructureTextData | null;
}

interface SemiStructureTextData {
  grokPattern?: string;
  multilineStartPattern?: string;
  excludeLinesPattern?: string;
  sampleStart: string;
  mappings: FindFileStructureResponse['mappings'];
  ecsCompatibility?: string;
}

function semiStructureTextDataGuard(
  semiStructureTextData: SemiStructureTextData | null
): semiStructureTextData is SemiStructureTextData {
  return (
    semiStructureTextData !== null &&
    semiStructureTextData.grokPattern !== undefined &&
    semiStructureTextData.multilineStartPattern !== undefined
  );
}

export const FileContents: FC<Props> = ({ data, format, numberOfLines, semiStructureTextData }) => {
  let mode = EDITOR_MODE.TEXT;
  if (format === EDITOR_MODE.JSON) {
    mode = EDITOR_MODE.JSON;
  }
  const isMounted = useMountedState();
  const grokHighlighter = useGrokHighlighter();

  const [isSemiStructureTextData, setIsSemiStructureTextData] = useState(
    semiStructureTextDataGuard(semiStructureTextData)
  );
  const formattedData = useMemo(
    () => limitByNumberOfLines(data, numberOfLines),
    [data, numberOfLines]
  );

  const [highlightedLines, setHighlightedLines] = useState<JSX.Element[] | null>(null);
  const [showHighlights, setShowHighlights] = useState<boolean>(isSemiStructureTextData);

  useEffect(() => {
    if (isSemiStructureTextData === false) {
      return;
    }
    const { grokPattern, multilineStartPattern, excludeLinesPattern, mappings, ecsCompatibility } =
      semiStructureTextData!;

    grokHighlighter(
      data,
      grokPattern!,
      mappings,
      ecsCompatibility,
      multilineStartPattern!,
      excludeLinesPattern
    )
      .then((docs) => {
        if (isMounted()) {
          setHighlightedLines(docs);
        }
      })
      .catch((e) => {
        if (isMounted()) {
          setHighlightedLines(null);
          setIsSemiStructureTextData(false);
        }
      });
  }, [data, semiStructureTextData, grokHighlighter, isSemiStructureTextData, isMounted]);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.dataVisualizer.file.fileContents.fileContentsTitle"
                defaultMessage="File contents"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        {isSemiStructureTextData ? (
          <EuiFlexItem grow={false} data-test-subj="dataVisualizerFileContentsHighlightingSwitch">
            <EuiSwitch
              label={i18n.translate('xpack.dataVisualizer.file.fileContents.highlightSwitch', {
                defaultMessage: 'Grok pattern highlighting',
              })}
              compressed
              checked={showHighlights}
              onChange={() => setShowHighlights(!showHighlights)}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <FormattedMessage
        id="xpack.dataVisualizer.file.fileContents.firstLinesDescription"
        defaultMessage="First {numberOfLines, plural, zero {# line} one {# line} other {# lines}}"
        values={{
          numberOfLines: showHighlights ? LINE_LIMIT : numberOfLines,
        }}
      />

      <EuiSpacer size="s" />

      {highlightedLines === null || showHighlights === false ? (
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
    </>
  );
};

function limitByNumberOfLines(data: string, numberOfLines: number) {
  return data.split('\n').slice(0, numberOfLines).join('\n');
}
