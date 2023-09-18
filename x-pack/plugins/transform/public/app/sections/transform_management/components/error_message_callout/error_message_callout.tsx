/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { IHttpFetchError } from '@kbn/core-http-browser';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { ToastNotificationText } from '../../../../components';

export const ErrorMessageCallout: FC<{
  text: JSX.Element;
  errorMessage: IHttpFetchError<unknown> | string | null;
}> = ({ text, errorMessage }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        title={
          <>
            {text}{' '}
            {errorMessage !== null && (
              <ToastNotificationText inline={true} forceModal={true} text={errorMessage} />
            )}
          </>
        }
        color="danger"
        iconType="error"
      />
    </>
  );
};
