/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiButtonProps, EuiButton } from '@elastic/eui';

import * as i18n from './translations';

const STORE_URL = 'https://store.servicenow.com/';

interface Props {
  color: EuiButtonProps['color'];
}

const SNStoreButtonComponent: React.FC<Props> = ({ color }) => {
  return (
    <EuiButton href={STORE_URL} color={color} iconSide="right" iconType="popout">
      {i18n.VISIT_SN_STORE}
    </EuiButton>
  );
};

export const SNStoreButton = memo(SNStoreButtonComponent);
