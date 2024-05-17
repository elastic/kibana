/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import { LookingFor } from './blurbs';

export function CheckingSettings({ checkMessage }) {
  const message = checkMessage || (
    <FormattedMessage
      id="xpack.monitoring.noData.defaultLoadingMessage"
      defaultMessage="Loading, please wait..."
    />
  );
  return (
    <Fragment>
      <LookingFor />
      <EuiHorizontalRule size="half" />
      <EuiFlexGroup alignItems="center" gutterSize="s" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{message}</EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
}

CheckingSettings.propTypes = {
  checkMessage: PropTypes.string,
};
