/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const LoadingIndicator: FC = () => (
  <Fragment>
    <EuiSpacer size="xxl" />
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="l" />
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiText color="subdued">
          <FormattedMessage id="xpack.ml.fieldDataCard.loadingLabel" defaultMessage="Loading" />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </Fragment>
);
