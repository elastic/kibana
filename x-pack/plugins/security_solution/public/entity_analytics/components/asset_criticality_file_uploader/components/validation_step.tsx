/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiCodeBlock, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import Papa from 'papaparse';
import React, { useMemo } from 'react';
import deepEqual from 'fast-deep-equal';
import { downloadBlob } from '../../../../common/utils/download_blob';

interface AssetCriticalityValidationStepProps {
  validLines: string[][];
  invalidLines: string[][];
}

export const AssetCriticalityValidationStep: React.FC<AssetCriticalityValidationStepProps> = ({
  validLines,
  invalidLines,
}) => {
  const { euiTheme } = useEuiTheme();
  const [validLinesAsText, invalidLinesAsText] = useMemo(
    () => [
      validLines && Papa.unparse(validLines),
      invalidLines &&
        Papa.unparse(invalidLines.map((line) => (deepEqual(line, ['']) ? ['<EMPTY_LINE>'] : line))),
    ],
    [validLines, invalidLines]
  );
  return (
    <>
      <EuiSpacer size="l" />

      {`${validLines.length} hosts will be mapped`}

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

      {`${invalidLines.length} asset criticality value or hosts is not recognized`}

      {invalidLines && (
        <EuiButtonEmpty
          onClick={() => {
            if (invalidLines) {
              const invalidLinesText = Papa.unparse(invalidLines);
              downloadBlob(new Blob([invalidLinesText]), `invalid_asset_criticality.csv`);
            }
          }}
        >
          {'Download CSV'}
        </EuiButtonEmpty>
      )}

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

      <EuiSpacer size="s" />
      <EuiButtonEmpty>{`back`}</EuiButtonEmpty>

      <EuiButton fill>{`Assign hosts`}</EuiButton>
    </>
  );
};
