/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n/react';

import React, { FC } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiPage,
  EuiPageBody,
  EuiPageContentHeader,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FindFileStructureResponse } from '../../../../../file_upload/common';

import { FileContents } from '../file_contents';
import { AnalysisSummary } from '../analysis_summary';
import { FieldsStatsGrid } from '../fields_stats_grid';

interface Props {
  data: string;
  fileName: string;
  results: FindFileStructureResponse;
  showEditFlyout(): void;
  showExplanationFlyout(): void;
  disableButtons: boolean;
}

export const ResultsView: FC<Props> = ({
  data,
  fileName,
  results,
  showEditFlyout,
  showExplanationFlyout,
  disableButtons,
}) => {
  return (
    <EuiPage data-test-subj="mlPageFileDataVisResults">
      <EuiPageBody>
        <EuiPageContentHeader>
          <EuiTitle>
            <h1 data-test-subj="mlFileDataVisResultsTitle">{fileName}</h1>
          </EuiTitle>
        </EuiPageContentHeader>
        <EuiSpacer size="m" />
        <div className="results">
          <EuiPanel data-test-subj="mlFileDataVisFileContentPanel">
            <FileContents
              data={data}
              format={results.format}
              numberOfLines={results.num_lines_analyzed}
            />
          </EuiPanel>

          <EuiSpacer size="m" />

          <EuiPanel data-test-subj="mlFileDataVisSummaryPanel">
            <AnalysisSummary results={results} />

            <EuiSpacer size="m" />

            <EuiFlexGroup gutterSize="s" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiButton onClick={() => showEditFlyout()} disabled={disableButtons}>
                  <FormattedMessage
                    id="xpack.fileDataVisualizer.resultsView.overrideSettingsButtonLabel"
                    defaultMessage="Override settings"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={() => showExplanationFlyout()} disabled={disableButtons}>
                  <FormattedMessage
                    id="xpack.fileDataVisualizer.resultsView.analysisExplanationButtonLabel"
                    defaultMessage="Analysis explanation"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer size="m" />

          <EuiPanel data-test-subj="mlFileDataVisFileStatsPanel">
            <EuiTitle size="s">
              <h2 data-test-subj="mlFileDataVisStatsTitle">
                <FormattedMessage
                  id="xpack.fileDataVisualizer.resultsView.fileStatsName"
                  defaultMessage="File stats"
                />
              </h2>
            </EuiTitle>

            <FieldsStatsGrid results={results} />
          </EuiPanel>
        </div>
      </EuiPageBody>
    </EuiPage>
  );
};
