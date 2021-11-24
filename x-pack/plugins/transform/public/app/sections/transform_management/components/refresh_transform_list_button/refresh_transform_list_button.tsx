/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface RefreshTransformListButton {
  isLoading: boolean;
  onClick(): void;
}
export const RefreshTransformListButton: FC<RefreshTransformListButton> = ({
  onClick,
  isLoading,
}) => (
  <EuiButton
    color="success"
    iconType="refresh"
    data-test-subj={`transformRefreshTransformListButton${isLoading ? ' loading' : ' loaded'}`}
    onClick={onClick}
    isLoading={isLoading}
  >
    <FormattedMessage
      id="xpack.transform.transformList.refreshButtonLabel"
      defaultMessage="Reload"
    />
  </EuiButton>
);
