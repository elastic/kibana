/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlyoutBody, EuiCallOut } from '@elastic/eui';
import { EuiFlyoutHeader, EuiTitle } from '@elastic/eui';

export interface Props {
  pipelineName: string | string[] | null | undefined;
}

export const PipelineNotFoundFlyout: FunctionComponent<Props> = ({ pipelineName }) => {
  return (
    <>
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
    </>
  );
};
