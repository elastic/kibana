/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { EuiHorizontalRule, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { LookingFor } from './blurbs';
import { FormattedMessage } from '@kbn/i18n/react';

export function CheckingSettings({ checkMessage }) {
  const message = checkMessage || (
    <FormattedMessage
      id="xpack.monitoring.noData.defaultLoadingMessage"
      defaultMessage="Loading, please wait"
    />
  );
  return (
    <Fragment>
      <LookingFor />
      <EuiHorizontalRule size="half" />
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{message}...</EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
}

CheckingSettings.propTypes = {
  checkMessage: PropTypes.string,
};
