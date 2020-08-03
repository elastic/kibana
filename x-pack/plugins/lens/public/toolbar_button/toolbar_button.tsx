/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './toolbar_button.scss';
import React from 'react';
import classNames from 'classnames';
import { EuiButton, PropsOf, EuiButtonProps } from '@elastic/eui';

export type ToolbarButtonProps = PropsOf<typeof EuiButton> & {
  /**
   * Determines prominence
   */
  fontWeight?: 'normal' | 'bold';
  /**
   * Smaller buttons also remove extra shadow for less prominence
   */
  size?: EuiButtonProps['size'];
};

export const ToolbarButton: React.FunctionComponent<ToolbarButtonProps> = ({
  children,
  className,
  fontWeight = 'normal',
  size = 'm',
  ...rest
}) => {
  const classes = classNames(
    'lnsToolbarButton',
    [`lnsToolbarButton--${fontWeight}`, `lnsToolbarButton--${size}`],
    className
  );
  return (
    <EuiButton
      className={classes}
      iconSide="right"
      iconType="arrowDown"
      color="text"
      contentProps={{
        className: 'lnsToolbarButton__content',
      }}
      textProps={{
        className: 'lnsToolbarButton__text',
      }}
      {...rest}
      size={size}
    >
      {children}
    </EuiButton>
  );
};
