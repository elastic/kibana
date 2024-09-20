/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useAbortableAsync } from '@kbn/observability-utils/hooks/use_abortable_async';
import { i18n } from '@kbn/i18n';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { useKibana } from './use_kibana';

const getDetailsFromErrorResponse = (error: IHttpFetchError<ResponseErrorBody>) =>
  error.body?.message ?? error.response?.statusText;

export function useInventoryAbortableAsync<T>(...args: Parameters<typeof useAbortableAsync<T>>) {
  const {
    core: { notifications },
  } = useKibana();
  const response = useAbortableAsync(...args);

  if (response.error) {
    const errorMessage =
      'response' in response.error
        ? getDetailsFromErrorResponse(response.error as IHttpFetchError<ResponseErrorBody>)
        : response.error.message;

    notifications.toasts.addDanger({
      title: i18n.translate('xpack.inventory.apiCall.error.title', {
        defaultMessage: `Error while fetching resource`,
      }),
      text: errorMessage,
    });
  }

  return response;
}
