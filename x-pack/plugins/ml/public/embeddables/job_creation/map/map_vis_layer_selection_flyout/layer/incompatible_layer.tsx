/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

interface Props {
  noDataView: boolean;
}

export const IncompatibleLayer: FC<Props> = ({ noDataView }) => {
  return (
    <EuiFlexGroup gutterSize="s" color="subdued" data-test-subj="mlMapLayerIncompatible">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiIcon type="crossInACircleFilled" color="subdued" />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued" size="s">
          {noDataView === true ? (
            <FormattedMessage
              id="xpack.ml.embeddables.geoJobFlyout.noDataViewError"
              defaultMessage="There is no source data view for this layer. It cannot be used to create an anomaly detection job"
            />
          ) : (
            <FormattedMessage
              id="xpack.ml.embeddables.geoJobFlyout.noTimeFieldError"
              defaultMessage="The source data view for this layer does not contain a timestamp field. It cannot be used to create an anomaly detection job"
            />
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
