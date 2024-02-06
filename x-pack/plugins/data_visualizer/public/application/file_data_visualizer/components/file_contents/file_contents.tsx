/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC, useEffect, useState, useMemo } from 'react';

import { EuiTitle, EuiSpacer, EuiHorizontalRule, EuiTab, EuiTabs } from '@elastic/eui';

import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import useMountedState from 'react-use/lib/useMountedState';
import { EDITOR_MODE, JsonEditor } from '../json_editor';
import { useGrokHighlighter } from './use_text_parser';

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

enum TABS {
  PARSED = 'parsed',
  RAW = 'raw',
}

export const FileContents: FC<Props> = ({ data, format, numberOfLines, semiStructureTextData }) => {
  let mode = EDITOR_MODE.TEXT;
  if (format === EDITOR_MODE.JSON) {
    mode = EDITOR_MODE.JSON;
  }
  const isMounted = useMountedState();
  const grokHighlighter = useGrokHighlighter();

  const [showParsedData, setShowParsedData] = useState(
    semiStructureTextDataGuard(semiStructureTextData)
  );
  const formattedData = useMemo(
    () => limitByNumberOfLines(data, numberOfLines),
    [data, numberOfLines]
  );

  const [highlightedLines, setHighlightedLines] = useState<JSX.Element[] | null>(null);
  const [selectedTab, setSelectedTab] = useState<TABS>(showParsedData ? TABS.PARSED : TABS.RAW);

  useEffect(() => {
    if (showParsedData === false) {
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
          setShowParsedData(false);
        }
      });
  }, [data, semiStructureTextData, grokHighlighter, showParsedData, isMounted]);

  return (
    <>
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.dataVisualizer.file.fileContents.fileContentsTitle"
            defaultMessage="File contents"
          />
        </h2>
      </EuiTitle>

      {showParsedData ? (
        <EuiTabs data-test-subj="dataVisualizerFileContentsTabs">
          <EuiTab
            isSelected={selectedTab === TABS.PARSED}
            onClick={() => setSelectedTab(TABS.PARSED)}
            data-test-subj="dataVisualizerFileContentsParsedTab"
          >
            <FormattedMessage
              id="xpack.dataVisualizer.file.fileContents.tab.parsedTitle"
              defaultMessage="Highlighted text"
            />
          </EuiTab>
          <EuiTab
            isSelected={selectedTab === TABS.RAW}
            onClick={() => setSelectedTab(TABS.RAW)}
            data-test-subj="dataVisualizerFileContentsRawTab"
          >
            <FormattedMessage
              id="xpack.dataVisualizer.file.fileContents.tab.rawTitle"
              defaultMessage="Raw text"
            />
          </EuiTab>
        </EuiTabs>
      ) : null}

      <EuiSpacer size="s" />

      {highlightedLines === null || selectedTab === TABS.RAW ? (
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
