/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { EuiButtonEmpty } from '@elastic/eui';
import { UX_LABELS } from '../../translations';

const buttonCss = css`
  border-top: ${euiThemeVars.euiBorderThin};
  border-radius: 0;
`;
export const ClearAllButton = memo(
  ({
    'data-test-subj': dataTestSubj,
    isDisabled,
    onClick,
  }: {
    'data-test-subj'?: string;
    isDisabled: boolean;
    onClick: () => void;
  }) => {
    return (
      <EuiButtonEmpty
        css={buttonCss}
        data-test-subj={dataTestSubj}
        isDisabled={isDisabled}
        onClick={onClick}
        iconType="cross"
        color="danger"
      >
        {UX_LABELS.filterClearAll}
      </EuiButtonEmpty>
    );
  }
);

ClearAllButton.displayName = 'ClearAllButton';
