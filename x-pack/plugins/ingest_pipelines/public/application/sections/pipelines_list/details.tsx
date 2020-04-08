/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/118n';
import { EuiFlyout, EuiFlyoutHeader, EuiFlyoutBody, EuiTitle } from '@elastic/eui';
import { Pipeline } from '../../../../common/types';

export interface Props {
  pipeline: Pipeline;
  onClose: () => void;
}

export const PipelineDetails: FunctionComponent<Props> = ({ pipeline, onClose }) => {
  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="pipelineDetailsFlyoutTitle"
      size="m"
      maxWidth={550}
    >
      <EuiFlyoutHeader>
        <EuiTitle id="pipelineDetailsFlyoutTitle">
          <h2>{pipeline.name}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
    </EuiFlyout>
  );
};
