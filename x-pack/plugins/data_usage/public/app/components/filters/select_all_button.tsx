/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { memo } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { UX_LABELS } from '../../translations';

const EuiButtonEmptyCss = css`
  border-top: ${euiThemeVars.euiBorderThin};
  border-radius: 0;
`;

interface StyledButtonEmptyProps {
  isDisabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}
const StyledEuiButtonEmpty = ({ isDisabled, onClick, children }: StyledButtonEmptyProps) => (
  <EuiButtonEmpty
    iconType="check"
    color="primary"
    isDisabled={isDisabled}
    onClick={onClick}
    css={EuiButtonEmptyCss}
  >
    {children}
  </EuiButtonEmpty>
);

export const SelectAllButton = memo(
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
      <StyledEuiButtonEmpty data-test-subj={dataTestSubj} isDisabled={isDisabled} onClick={onClick}>
        {UX_LABELS.filterSelectAll}
      </StyledEuiButtonEmpty>
    );
  }
);

SelectAllButton.displayName = 'SelectAllButton';
