/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';

import { ResponseError } from '../../lib/api';
import { getEsDeprecationError } from '../../lib/get_es_deprecation_error';
interface Props {
  error: ResponseError;
}

export const EsDeprecationErrors: React.FunctionComponent<Props> = ({ error }) => {
  const { code: errorType, message } = getEsDeprecationError(error);

  switch (errorType) {
    case 'unauthorized_error':
      return (
        <EuiCallOut
          title={message}
          color="danger"
          iconType="alert"
          data-test-subj="permissionsError"
        />
      );
    case 'partially_upgraded_error':
      return (
        <EuiCallOut
          title={message}
          color="warning"
          iconType="alert"
          data-test-subj="partiallyUpgradedWarning"
        />
      );
    case 'upgraded_error':
      return <EuiCallOut title={message} iconType="pin" data-test-subj="upgradedCallout" />;
    case 'request_error':
    default:
      return (
        <EuiCallOut title={message} color="danger" iconType="alert" data-test-subj="requestError">
          {error.message}
        </EuiCallOut>
      );
  }
};
