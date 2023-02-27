/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useGetUrlParams } from '../../../hooks';

export const useMonitorNotFound = (error?: IHttpFetchError<ResponseErrorBody>) => {
  const { packagePolicyId } = useGetUrlParams();

  if (!error) return null;
  if (error.body?.statusCode === 404) {
    return (
      <>
        <EuiCallOut title="Monitor not found" color="warning" iconType="help">
          <p>
            Monitor is not found. Please check the monitor id and try again. If you are trying to
            add a new monitor, please click on the button below.
          </p>

          <EuiButton href="#" color="primary">
            Create new monitor
          </EuiButton>
        </EuiCallOut>
        <EuiSpacer size="m" />
        {packagePolicyId && (
          <EuiCallOut title="Leftover integration found" color="warning" iconType="help">
            <p>
              Please click on the button below to delete the integration. Normally this should not
              happen. Since the monitor has been deleted, the integration is deleted as well
              automatically.{' '}
              <EuiLink href="https://github.com/elastic/kibana/issues/new/choose">
                Report an issue.
              </EuiLink>
            </p>
            <EuiButton href={`#/policies/${packagePolicyId}/edit`} color="danger">
              Delete integration
            </EuiButton>
          </EuiCallOut>
        )}
      </>
    );
  }
};
