/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import { css } from '@emotion/css';
import classNames from 'classnames';
import React from 'react';

const buttonClassName = css`
  opacity: 0.5;
  &:disabled,
  &:hover {
    opacity: 1;
  }
  &:disabled {
    color: inherit;
  }
  padding-inline: 4px;
`;

interface InvestigateTextButtonProps {
  iconType: string;
  disabled?: boolean;
  onClick: () => void;
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>;
  children?: string;
  className?: string;
  type?: 'submit' | 'reset' | 'button';
}

export function InvestigateTextButton({
  iconType,
  disabled,
  onClick,
  children,
  onMouseEnter,
  onMouseLeave,
  className,
  type,
}: InvestigateTextButtonProps) {
  return (
    <EuiButtonEmpty
      size="s"
      iconSize="s"
      color="text"
      data-test-subj="investigateTextButton"
      iconType={iconType}
      disabled={disabled}
      className={classNames(buttonClassName, className)}
      onClick={() => {
        onClick();
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      type={type}
    >
      {children && <EuiText size="xs">{children}</EuiText>}
    </EuiButtonEmpty>
  );
}
