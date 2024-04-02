/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';

import type { FC } from 'react';
import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiPageBody,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';

import { FILE_FORMATS } from '../../../../../common/constants';
import { FileContents } from '../file_contents';
import { AnalysisSummary } from '../analysis_summary';
import { FieldsStatsGrid } from '../../../common/components/fields_stats_grid';
import { MODE as DATAVISUALIZER_MODE } from '../file_data_visualizer_view/constants';

interface Props {
  data: string;
  fileName: string;
  results: FindFileStructureResponse;
  showEditFlyout(): void;
  showExplanationFlyout(): void;
  disableButtons: boolean;
  onChangeMode: (mode: DATAVISUALIZER_MODE) => void;
  onCancel: () => void;
  disableImport?: boolean;
}

export const ResultsView: FC<Props> = ({
  data,
  fileName,
  results,
  showEditFlyout,
  showExplanationFlyout,
  disableButtons,
  onChangeMode,
  onCancel,
  disableImport,
}) => {
  const semiStructureTextData =
    results.format === FILE_FORMATS.SEMI_STRUCTURED_TEXT
      ? {
          grokPattern: results.grok_pattern,
          multilineStartPattern: results.multiline_start_pattern,
          sampleStart: results.sample_start,
          excludeLinesPattern: results.exclude_lines_pattern,
          mappings: results.mappings,
          ecsCompatibility: results.ecs_compatibility,
        }
      : null;
  return (
    <EuiPageBody data-test-subj="dataVisualizerPageFileResults">
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiTitle>
            <h2 data-test-subj="dataVisualizerFileResultsTitle">{fileName}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            onClick={onCancel}
            data-test-subj="dataVisualizerFileResultsCancelButton"
            size="s"
          >
            <FormattedMessage
              id="xpack.dataVisualizer.file.resultsView.cancelButtonLabel"
              defaultMessage="Select a different file"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />
      <div>
        <EuiPanel data-test-subj="dataVisualizerFileFileContentPanel" hasShadow={false} hasBorder>
          <FileContents
            data={data}
            format={results.format}
            numberOfLines={results.num_lines_analyzed}
            semiStructureTextData={semiStructureTextData}
          />
        </EuiPanel>

        <EuiSpacer size="m" />

        <EuiPanel data-test-subj="dataVisualizerFileSummaryPanel" hasShadow={false} hasBorder>
          <AnalysisSummary results={results} />

          <EuiSpacer size="m" />

          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                isDisabled={disableImport}
                onClick={() => onChangeMode(DATAVISUALIZER_MODE.IMPORT)}
                data-test-subj="dataVisualizerFileOpenImportPageButton"
              >
                <FormattedMessage
                  id="xpack.dataVisualizer.file.resultsView.importButtonLabel"
                  defaultMessage="Import"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={() => showEditFlyout()} disabled={disableButtons}>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.resultsView.overrideSettingsButtonLabel"
                  defaultMessage="Override settings"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => showExplanationFlyout()} disabled={disableButtons}>
                <FormattedMessage
                  id="xpack.dataVisualizer.file.resultsView.analysisExplanationButtonLabel"
                  defaultMessage="Analysis explanation"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>

        <EuiSpacer size="m" />

        <EuiPanel data-test-subj="dataVisualizerFileFileStatsPanel" hasShadow={false} hasBorder>
          <EuiTitle size="s">
            <h2 data-test-subj="dataVisualizerFileStatsTitle">
              <FormattedMessage
                id="xpack.dataVisualizer.file.resultsView.fileStatsName"
                defaultMessage="File stats"
              />
            </h2>
          </EuiTitle>

          <FieldsStatsGrid results={results} />
        </EuiPanel>
      </div>
    </EuiPageBody>
  );
};
