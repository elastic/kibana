/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlyout, EuiFlyoutBody, EuiCallOut } from '@elastic/eui';
import { EuiFlyoutHeader, EuiTitle } from '@elastic/eui';

interface Props {
  onClose: () => void;
  pipelineName: string | string[] | null | undefined;
}

export const PipelineNotFoundFlyout: FunctionComponent<Props> = ({ onClose, pipelineName }) => {
  return (
    <EuiFlyout onClose={onClose} size="m" maxWidth={550}>
      <EuiFlyoutHeader>
        {pipelineName && (
          <EuiTitle id="notFoundFlyoutTitle">
            <h2>{pipelineName}</h2>
          </EuiTitle>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.ingestPipelines.list.notFoundFlyoutMessage"
              defaultMessage="Pipeline not found"
            />
          }
          color="danger"
          iconType="alert"
        />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
