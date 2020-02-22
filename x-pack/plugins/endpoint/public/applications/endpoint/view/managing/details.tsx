/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useDispatch } from 'react-redux';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';

export const ManagementDetails = () => {
  const dispatch = useDispatch<(a: ManagementAction) => void>();
  const isVisible = true;
  const useLocation;

  return (
    <EuiFlyout>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="something">Flyout details</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <p>some body here </p>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
