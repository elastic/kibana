/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButtonProps, EuiButton, EuiLink } from '@elastic/eui';

import * as i18n from './translations';

const getStoreURL = (appId: string): string =>
  `https://store.servicenow.com/sn_appstore_store.do#!/store/application/${appId}`;

interface Props {
  appId: string;
  color: EuiButtonProps['color'];
}

const SNStoreButtonComponent: React.FC<Props> = ({ color, appId }) => {
  return (
    <EuiButton
      href={getStoreURL(appId)}
      color={color}
      iconSide="right"
      iconType="popout"
      target="_blank"
    >
      {i18n.VISIT_SN_STORE}
    </EuiButton>
  );
};

export const SNStoreButton = memo(SNStoreButtonComponent);

const SNStoreLinkComponent: React.FC<Pick<Props, 'appId'>> = ({ appId }) => (
  <EuiLink href={getStoreURL(appId)} target="_blank">
    {i18n.VISIT_SN_STORE}
  </EuiLink>
);

export const SNStoreLink = memo(SNStoreLinkComponent);
