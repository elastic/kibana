/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IHttpFetchError, ResponseErrorBody } from 'kibana/public';

export function formatHttpError(
  error: IHttpFetchError<ResponseErrorBody & { status: number; statusText: string }>
) {
  if (!error.response) {
    return i18n.translate('xpack.graph.fatalError.unavailableServerErrorMessage', {
      defaultMessage:
        'An HTTP request has failed to connect. ' +
        'Please check if the Kibana server is running and that your browser has a working connection, ' +
        'or contact your system administrator.',
    });
  }
  return i18n.translate('xpack.graph.fatalError.errorStatusMessage', {
    defaultMessage: 'Error {errStatus} {errStatusText}: {errMessage}',
    values: {
      errStatus: error.body?.status,
      errStatusText: error.body?.statusText,
      errMessage: error.body?.message,
    },
  });
}
