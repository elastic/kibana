/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { useManagementListSelector } from './hooks';
import { urlFromQueryParams } from './url_from_query_params';
import { uiQueryParams } from './../../store/managing/selectors';

export const ManagementDetails = () => {
  const history = useHistory();
  const queryParams = useManagementListSelector(uiQueryParams);
  const handleFlyoutClose = useCallback(() => {
    const { selected_host, ...queryParamsWithoutSelectedHost } = queryParams;
    history.push(urlFromQueryParams(queryParamsWithoutSelectedHost));
  }, [history, queryParams]);

  return (
    <EuiFlyout onClose={handleFlyoutClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>Flyout details</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <p>some body here </p>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
