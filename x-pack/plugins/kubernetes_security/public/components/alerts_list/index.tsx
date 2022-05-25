/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonIcon } from '@elastic/eui';
import { CSSObject } from '@emotion/react';

const alertsListContainer: CSSObject = {
  position: 'relative',
  height: '180px',
  padding: '16px',
  border: '1px solid #D3DAE6',
  borderRadius: '6px',
  fontWeight: 700,
  fontSize: '12px',
  lineHeight: '16px',
};

const alertsList: CSSObject = {
  marginTop: '16px',
  height: 'calc(100% - 16px)',
  overflow: 'auto',
  paddingBottom: '16px',
};

const alertsInspect: CSSObject = {
  position: 'absolute',
  top: '16px',
  right: '16px',
};

interface AlertsListDeps {
  onInspect?: () => void;
  children: ReactNode;
}

export const AlertsList = ({ children, onInspect }: AlertsListDeps) => (
  <div css={alertsListContainer}>
    <div>
      <FormattedMessage id="xpack.kubernetesSecurity.widget.alerts" defaultMessage="Alerts" />
    </div>
    <div className="eui-yScroll" css={alertsList}>
      {children}
    </div>
    {onInspect && (
      <EuiButtonIcon css={alertsInspect} iconType="inspect" color="primary" onClick={onInspect} />
    )}
  </div>
);
