/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { downloadBlob } from '../../../../common/utils/download_blob';
import type { RowValidationErrors } from '../validations';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';

export interface AssetCriticalityValidationStepProps {
  validLinesCount: number;
  invalidLinesCount: number;
  validLinesAsText?: string;
  invalidLinesAsText?: string;
  fileName: string;
  fileSize: number;
  onConfirm: () => void;
  onReturn: () => void;
  invalidLinesErrors: RowValidationErrors[];
}

const CODE_BLOCK_HEIGHT = 250;
const INVALID_FILE_NAME = `invalid_asset_criticality.csv`;

export const AssetCriticalityValidationStep: React.FC<AssetCriticalityValidationStepProps> =
  React.memo(
    ({
      validLinesCount,
      invalidLinesCount,
      validLinesAsText,
      invalidLinesAsText,
      fileName,
      fileSize,
      onConfirm,
      onReturn,
      invalidLinesErrors,
    }) => {
      const { euiTheme } = useEuiTheme();
      const { telemetry } = useKibana().services;
      const annotations = invalidLinesErrors.reduce<Record<number, string>>((acc, e) => {
        acc[e.index] = e.error;
        return acc;
      }, {});

      const onConfirmClick = () => {
        telemetry.reportAssetCriticalityCsvImported({
          file: {
            size: fileSize,
          },
        });
        onConfirm();
      };

      return (
        <>
          <EuiSpacer size="l" />

          <FormattedMessage
            defaultMessage="{fileName} preview"
            id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.fileNamePreviewText"
            values={{ fileName }}
          />
          <EuiSpacer size="m" />
          {validLinesCount > 0 && (
            <>
              <EuiFlexGroup alignItems="baseline">
                <EuiFlexItem grow>
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={'checkInCircleFilled'} color="success" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <span data-test-subj="asset-criticality-validLinesMessage">
                        <FormattedMessage
                          id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.validLinesMessage"
                          defaultMessage="{validLinesCount, plural, one {{validLinesCountBold} asset criticality will be assigned} other {{validLinesCountBold} asset criticalities will be assigned}}"
                          values={{
                            validLinesCount,
                            validLinesCountBold: <b>{validLinesCount}</b>,
                          }}
                        />
                      </span>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty flush="right" onClick={onReturn} size="xs">
                    <FormattedMessage
                      id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.chooseAnotherFileText"
                      defaultMessage="Choose another file"
                    />
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="xs" />
              <EuiCodeBlock
                overflowHeight={CODE_BLOCK_HEIGHT}
                lineNumbers
                language="CSV"
                isVirtualized
                css={css`
                  border: 1px solid ${euiTheme.colors.success};
                `}
              >
                {validLinesAsText}
              </EuiCodeBlock>
              <EuiSpacer size="l" />
            </>
          )}

          {invalidLinesCount > 0 && (
            <>
              <EuiFlexGroup alignItems="baseline">
                <EuiFlexItem grow>
                  <EuiFlexGroup gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={'error'} color="danger" />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <span data-test-subj="asset-criticality-invalidLinesMessage">
                        <FormattedMessage
                          id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.invalidLinesMessage"
                          defaultMessage="{invalidLinesCount, plural, one {{invalidLinesCountBold} line is invalid and won't be assigned} other {{invalidLinesCountBold} lines are invalid and won't be assigned}}"
                          values={{
                            invalidLinesCount,
                            invalidLinesCountBold: <b>{invalidLinesCount}</b>,
                          }}
                        />
                      </span>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>

                <EuiFlexItem grow={false}>
                  {invalidLinesAsText && (
                    <EuiButtonEmpty
                      size="xs"
                      flush="right"
                      onClick={() => {
                        if (invalidLinesAsText.length > 0) {
                          downloadBlob(new Blob([invalidLinesAsText]), INVALID_FILE_NAME);
                        }
                      }}
                    >
                      <FormattedMessage
                        id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.downloadCSV"
                        defaultMessage="Download CSV"
                      />
                    </EuiButtonEmpty>
                  )}
                </EuiFlexItem>
              </EuiFlexGroup>

              <EuiSpacer size="s" />
              <EuiCodeBlock
                overflowHeight={CODE_BLOCK_HEIGHT}
                lineNumbers={{ annotations }}
                language="CSV"
                isVirtualized
                css={css`
                  border: 1px solid ${euiTheme.colors.danger};
                `}
              >
                {invalidLinesAsText}
              </EuiCodeBlock>
              <EuiSpacer size="l" />
            </>
          )}

          <EuiHorizontalRule />
          <EuiSpacer size="s" />

          <EuiFlexGroup justifyContent="spaceBetween" alignItems="baseline">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onReturn}>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.backButtonText"
                  defaultMessage="Back"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={onConfirmClick}
                disabled={validLinesCount === 0}
                data-test-subj="asset-criticality-assign-button"
              >
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.assignButtonText"
                  defaultMessage="Assign"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      );
    }
  );

AssetCriticalityValidationStep.displayName = 'AssetCriticalityValidationStep';
