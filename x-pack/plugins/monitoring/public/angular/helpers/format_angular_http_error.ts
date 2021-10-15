/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { IHttpResponse } from 'angular';

type AngularHttpError = IHttpResponse<{ message: string }>;

export function isAngularHttpError(error: any): error is AngularHttpError {
  return (
    error &&
    typeof error.status === 'number' &&
    typeof error.statusText === 'string' &&
    error.data &&
    typeof error.data.message === 'string'
  );
}

export function formatAngularHttpError(error: AngularHttpError) {
  // is an Angular $http "error object"
  if (error.status === -1) {
    // status = -1 indicates that the request was failed to reach the server
    return i18n.translate('xpack.monitoring.notify.fatalError.unavailableServerErrorMessage', {
      defaultMessage:
        'An HTTP request has failed to connect. ' +
        'Please check if the Kibana server is running and that your browser has a working connection, ' +
        'or contact your system administrator.',
    });
  }

  return i18n.translate('xpack.monitoring.notify.fatalError.errorStatusMessage', {
    defaultMessage: 'Error {errStatus} {errStatusText}: {errMessage}',
    values: {
      errStatus: error.status,
      errStatusText: error.statusText,
      errMessage: error.data.message,
    },
  });
}
