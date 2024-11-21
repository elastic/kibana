/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { memo } from 'react';
import { EuiButtonEmpty, EuiButtonEmptyProps } from '@elastic/eui';

const EuiButtonEmptyCss = css`
  border-top: ${euiThemeVars.euiBorderThin};
  border-radius: 0;
`;

interface StyledButtonEmptyProps {
  color: EuiButtonEmptyProps['color'];
  icon: EuiButtonEmptyProps['iconType'];
  isDisabled: boolean;
  onClick: () => void;
}
const StyledEuiButtonEmpty = ({
  isDisabled,
  onClick,
  children,
  color,
  icon,
}: StyledButtonEmptyProps & { children: React.ReactNode }) => (
  <EuiButtonEmpty
    iconType={icon}
    color={color}
    isDisabled={isDisabled}
    onClick={onClick}
    css={EuiButtonEmptyCss}
  >
    {children}
  </EuiButtonEmpty>
);

export const ToggleAllButton = memo(
  ({
    color,
    'data-test-subj': dataTestSubj,
    icon,
    isDisabled,
    label,
    onClick,
  }: {
    'data-test-subj'?: string;
    label: string;
  } & StyledButtonEmptyProps) => {
    return (
      <StyledEuiButtonEmpty
        color={color}
        data-test-subj={dataTestSubj}
        icon={icon}
        isDisabled={isDisabled}
        onClick={onClick}
      >
        {label}
      </StyledEuiButtonEmpty>
    );
  }
);

ToggleAllButton.displayName = 'ToggleAllButton';
