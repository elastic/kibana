/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiEmptyPrompt, EuiPanel, EuiTitle, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { IHttpFetchError } from 'src/core/public';

interface EmptyStateErrorProps {
  errors: IHttpFetchError[];
}

export const EmptyStateError = ({ errors }: EmptyStateErrorProps) => {
  const unauthorized = errors.find(
    (error: Error) => error.message && error.message.includes('unauthorized')
  );

  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiPanel>
          <EuiEmptyPrompt
            iconType="securityApp"
            iconColor="subdued"
            title={
              <EuiTitle size="m">
                {unauthorized ? (
                  <h3>
                    {i18n.translate('xpack.uptime.emptyStateError.notAuthorized', {
                      defaultMessage:
                        'You are not authorized to view Uptime data, please contact your system administrator.',
                    })}
                  </h3>
                ) : (
                  <h3>
                    {i18n.translate('xpack.uptime.emptyStateError.title', {
                      defaultMessage: 'Error',
                    })}
                  </h3>
                )}
              </EuiTitle>
            }
            body={
              <Fragment>
                {!unauthorized &&
                  errors.map((error: Error) => <p key={error.message}>{error.message}</p>)}
              </Fragment>
            }
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
