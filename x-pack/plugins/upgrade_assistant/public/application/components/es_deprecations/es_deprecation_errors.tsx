/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPageContent } from '@elastic/eui';

import { APP_WRAPPER_CLASS } from '../../../../../../../src/core/public';
import { ResponseError } from '../../lib/api';
import { getEsDeprecationError } from '../../lib/es_deprecation_errors';
interface Props {
  error: ResponseError;
}

export const EsDeprecationErrors: React.FunctionComponent<Props> = ({ error }) => {
  const { code: errorType, message } = getEsDeprecationError(error);
  let errorPrompt: React.ReactNode;

  switch (errorType) {
    case 'unauthorized_error':
      errorPrompt = (
        <EuiEmptyPrompt
          title={<h2>{message}</h2>}
          color="danger"
          iconType="alert"
          data-test-subj="permissionsError"
        />
      );
      break;
    case 'partially_upgraded_error':
      errorPrompt = (
        <EuiEmptyPrompt
          title={<h2>{message}</h2>}
          color="warning"
          iconType="alert"
          data-test-subj="partiallyUpgradedWarning"
        />
      );
      break;
    case 'upgraded_error':
      errorPrompt = (
        <EuiEmptyPrompt
          title={<h2>{message}</h2>}
          iconType="pin"
          data-test-subj="upgradedCallout"
        />
      );
      break;
    case 'request_error':
    default:
      errorPrompt = (
        <EuiEmptyPrompt
          title={<h2>{message}</h2>}
          body={<p>{error.message}</p>}
          color="danger"
          iconType="alert"
          data-test-subj="requestError"
        />
      );
  }

  return (
    <div className={APP_WRAPPER_CLASS}>
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="danger">
        {errorPrompt}
      </EuiPageContent>
    </div>
  );
};
