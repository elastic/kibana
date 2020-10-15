/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import React, { FC } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiPage,
  EuiPageBody,
  EuiPageContentHeader,
  EuiPanel,
  EuiTabbedContent,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { FindFileStructureResponse } from '../../../../../../common/types/file_datavisualizer';

import { FileContents } from '../file_contents';
import { AnalysisSummary } from '../analysis_summary';
// @ts-ignore
import { FieldsStats } from '../fields_stats';

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
  const tabs = [
    {
      id: 'file-stats',
      name: i18n.translate('xpack.ml.fileDatavisualizer.resultsView.fileStatsTabName', {
        defaultMessage: 'File stats',
      }),
      content: <FieldsStats results={results} />,
    },
  ];

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
                    id="xpack.ml.fileDatavisualizer.resultsView.overrideSettingsButtonLabel"
                    defaultMessage="Override settings"
                  />
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={() => showExplanationFlyout()} disabled={disableButtons}>
                  <FormattedMessage
                    id="xpack.ml.fileDatavisualizer.resultsView.analysisExplanationButtonLabel"
                    defaultMessage="Analysis explanation"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiSpacer size="m" />

          <EuiPanel data-test-subj="mlFileDataVisFileStatsPanel">
            <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} onTabClick={() => {}} />
          </EuiPanel>
        </div>
      </EuiPageBody>
    </EuiPage>
  );
};
