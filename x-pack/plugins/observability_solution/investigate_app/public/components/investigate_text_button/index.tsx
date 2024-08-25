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
`;

const buttonOnlyClassName = css`
  .euiButtonEmpty__content {
    gap: 0;
  }
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
  color?: React.ComponentProps<typeof EuiButtonEmpty>['color'];
  size?: 'xs' | 's' | 'm';
  iconSize?: 's' | 'm';
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
  color = 'text',
  size = 's',
  iconSize = 's',
}: InvestigateTextButtonProps) {
  const props = {
    size,
    iconSize,
    iconType,
    color,
    disabled,
    className: classNames(buttonClassName, className, {
      [buttonOnlyClassName]: !children,
    }),
    onClick,
    onMouseEnter,
    onMouseLeave,
    type,
    children: children ? <EuiText size="xs">{children}</EuiText> : undefined,
  };

  return <EuiButtonEmpty data-test-subj="investigateTextButton" {...props} />;
}
