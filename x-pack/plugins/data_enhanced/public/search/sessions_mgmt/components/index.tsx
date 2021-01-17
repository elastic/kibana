/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLinkProps, EuiText, EuiTextProps } from '@elastic/eui';
import React from 'react';
import extendSessionIcon from '../icons/extend_session.svg';

export { OnActionComplete, PopoverActionsMenu } from './actions';

export const TableText = ({ children, ...props }: EuiTextProps) => {
  return (
    <EuiText size="m" {...props}>
      {children}
    </EuiText>
  );
};

export interface IClickActionDescriptor {
  label: string | React.ReactElement;
  iconType: 'trash' | 'cancel' | typeof extendSessionIcon;
  textColor: EuiTextProps['color'];
}

export interface IHrefActionDescriptor {
  label: string;
  props: EuiLinkProps;
}

export interface StatusDef {
  textColor?: EuiTextProps['color'];
  icon?: React.ReactElement;
  label: React.ReactElement;
  toolTipContent: string;
}
