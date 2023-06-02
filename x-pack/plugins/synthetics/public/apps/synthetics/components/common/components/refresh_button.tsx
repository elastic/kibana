/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton } from '@elastic/eui';
import { useSyntheticsRefreshContext } from '../../../contexts';

export function RefreshButton() {
  const { refreshApp } = useSyntheticsRefreshContext();
  return (
    <EuiButton
      data-test-subj="syntheticsRefreshButtonButton"
      iconType="refresh"
      onClick={() => refreshApp()}
    >
      {REFRESH_LABEL}
    </EuiButton>
  );
}

export const REFRESH_LABEL = i18n.translate('xpack.synthetics.overview.refresh', {
  defaultMessage: 'Refresh',
});
