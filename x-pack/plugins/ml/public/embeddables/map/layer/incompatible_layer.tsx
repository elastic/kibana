/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

export const IncompatibleLayer: FC = () => {
  return (
    <EuiFlexGroup gutterSize="s" color="subdued" data-test-subj="mlMapLayerIncompatible">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiIcon type="crossInACircleFilled" color="subdued" />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued" size="s">
          <FormattedMessage
            id="xpack.ml.embeddables.geoJobFlyout.defaultLayerError"
            defaultMessage="This layer cannot be used to create an anomaly detection job"
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
