/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLinkProps, EuiText, EuiTextProps } from '@elastic/eui';
import { IUiSettingsClient } from 'kibana/public';
import React from 'react';
import { UISession } from '../../../../common/search/sessions_mgmt';
import extendSessionIcon from '../icons/extend_session.svg';

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

export interface StatusIndicatorProps {
  now?: string;
  session: UISession;
  uiSettings: IUiSettingsClient;
}

export interface StatusDef {
  textColor?: EuiTextProps['color'];
  icon?: React.ReactElement;
  label: React.ReactElement;
  toolTipContent: string;
}
