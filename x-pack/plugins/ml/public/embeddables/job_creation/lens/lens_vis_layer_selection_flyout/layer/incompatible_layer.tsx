/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { extractErrorMessage } from '@kbn/ml-error-utils';

import type { LayerResult } from '../../../../../application/jobs/new_job/job_from_lens';

interface Props {
  layer: LayerResult;
}

export const IncompatibleLayer: FC<Props> = ({ layer }) => {
  return (
    <EuiFlexGroup gutterSize="s" color="subdued" data-test-subj="mlLensLayerIncompatible">
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <EuiIcon type="error" color="subdued" />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText color="subdued" size="s">
          {layer.error ? (
            extractErrorMessage(layer.error)
          ) : (
            <FormattedMessage
              id="xpack.ml.embeddables.lensLayerFlyout.defaultLayerError"
              defaultMessage="This layer cannot be used to create an anomaly detection job"
            />
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
