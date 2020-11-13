/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './toolbar_button.scss';
import React from 'react';
import classNames from 'classnames';
import { EuiButton, PropsOf, EuiButtonProps } from '@elastic/eui';

const groupPositionToClassMap = {
  none: null,
  left: 'lnsToolbarButton--groupLeft',
  center: 'lnsToolbarButton--groupCenter',
  right: 'lnsToolbarButton--groupRight',
};

export type ToolbarButtonProps = PropsOf<typeof EuiButton> & {
  /**
   * Determines prominence
   */
  fontWeight?: 'normal' | 'bold';
  /**
   * Smaller buttons also remove extra shadow for less prominence
   */
  size?: EuiButtonProps['size'];
  /**
   * Determines if the button will have a down arrow or not
   */
  hasArrow?: boolean;
  /**
   * Adjusts the borders for groupings
   */
  groupPosition?: 'none' | 'left' | 'center' | 'right';
  dataTestSubj?: string;
};

export const ToolbarButton: React.FunctionComponent<ToolbarButtonProps> = ({
  children,
  className,
  fontWeight = 'normal',
  size = 'm',
  hasArrow = true,
  groupPosition = 'none',
  dataTestSubj = '',
  ...rest
}) => {
  const classes = classNames(
    'lnsToolbarButton',
    groupPositionToClassMap[groupPosition],
    [`lnsToolbarButton--${fontWeight}`, `lnsToolbarButton--${size}`],
    className
  );
  return (
    <EuiButton
      data-test-subj={dataTestSubj}
      className={classes}
      iconSide="right"
      iconType={hasArrow ? 'arrowDown' : ''}
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
