/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiIcon } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

const widget = (isAlert?: boolean): CSSObject => ({
  position: 'relative',
  height: '180px',
  padding: '16px',
  border: `1px solid ${isAlert ? '#BD271E' : '#D3DAE6'}`,
  borderRadius: '6px',
  fontWeight: 700,
  fontSize: '12px',
  lineHeight: '16px',
});

const widgetData: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  marginTop: '16px',
  fontSize: '27px',
  lineHeight: '32px',
};

interface KubernetesWidgetDeps {
  title: string;
  icon: string;
  iconColor: string;
  data: number;
  isAlert?: boolean;
  children?: ReactNode;
}

export const KubernetesWidget = ({
  title,
  icon,
  iconColor,
  data,
  isAlert,
  children,
}: KubernetesWidgetDeps) => (
  <div css={widget(isAlert)}>
    <div>{title}</div>
    <div css={widgetData}>
      <EuiIcon css={{ marginRight: '8px' }} type={icon} size="l" color={iconColor} />
      {data}
    </div>
    {children}
  </div>
);
