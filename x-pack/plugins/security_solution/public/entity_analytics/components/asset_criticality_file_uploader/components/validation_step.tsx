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
  EuiIcon,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { downloadBlob } from '../../../../common/utils/download_blob';

interface AssetCriticalityValidationStepProps {
  validLinesCount: number;
  invalidLinesCount: number;
  validLinesAsText?: string;
  invalidLinesAsText?: string;
  onConfirm: () => void;
  onReturn: () => void;
}

export const AssetCriticalityValidationStep: React.FC<AssetCriticalityValidationStepProps> = ({
  validLinesCount,
  invalidLinesCount,
  validLinesAsText,
  invalidLinesAsText,
  onConfirm,
  onReturn,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiSpacer size="l" />
      {validLinesCount > 0 && (
        <>
          <EuiIcon type={'checkInCircleFilled'} color="success" />
          <FormattedMessage
            id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.validLinesMessage"
            defaultMessage="{validLinesCount, plural, one {{validLinesCountBold} asset will be assigned} other {{validLinesCountBold} assets will be assigned}}"
            values={{ validLinesCount, validLinesCountBold: <b>{validLinesCount}</b> }}
          />

          <EuiCodeBlock
            overflowHeight={400}
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

      {'file.name preview????'}

      {invalidLinesCount > 0 && (
        <>
          <EuiFlexGroup alignItems="baseline" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiIcon type={'error'} color="danger" />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <span>
                <FormattedMessage
                  id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.invalidLinesMessage"
                  defaultMessage="{invalidLinesCount, plural, one {{invalidLinesCountBold} invalid line won't be assigned} other {{invalidLinesCountBold} invalid lines won't be assigned}}"
                  values={{ invalidLinesCount, invalidLinesCountBold: <b>{invalidLinesCount}</b> }}
                />
              </span>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              {invalidLinesAsText && (
                <EuiButtonEmpty
                  flush="right"
                  onClick={() => {
                    if (invalidLinesAsText.length > 0) {
                      downloadBlob(new Blob([invalidLinesAsText]), `invalid_asset_criticality.csv`);
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
          <EuiCodeBlock
            overflowHeight={400}
            lineNumbers
            language="CSV"
            isVirtualized
            css={css`
              border: 1px solid ${euiTheme.colors.danger};
            `}
          >
            {invalidLinesAsText}
          </EuiCodeBlock>
        </>
      )}

      <EuiSpacer size="s" />
      <EuiButtonEmpty onClick={onReturn}>
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.back"
          defaultMessage="back"
        />
      </EuiButtonEmpty>

      <EuiButton fill onClick={onConfirm} disabled={validLinesCount === 0}>
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.assetCriticalityValidationStep.assign"
          defaultMessage="Assign"
        />
      </EuiButton>
    </>
  );
};
