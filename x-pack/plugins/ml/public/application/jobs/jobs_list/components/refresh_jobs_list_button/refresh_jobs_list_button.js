/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const RefreshJobsListButton = ({ onRefreshClick, isRefreshing }) => (
  <EuiButtonEmpty
    data-test-subj="mlRefreshJobListButton"
    onClick={onRefreshClick}
    isLoading={isRefreshing}
  >
    <FormattedMessage id="xpack.ml.jobsList.refreshButtonLabel" defaultMessage="Refresh" />
  </EuiButtonEmpty>
);

RefreshJobsListButton.propTypes = {
  onRefreshClick: PropTypes.func.isRequired,
  isRefreshing: PropTypes.bool.isRequired,
};
