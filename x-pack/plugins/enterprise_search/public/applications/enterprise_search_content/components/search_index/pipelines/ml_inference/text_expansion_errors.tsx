/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCallOut, EuiLink } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { HttpError } from '../../../../../../../common/types/api';
import { getErrorsFromHttpResponse } from '../../../../../shared/flash_messages/handle_api_errors';
import { HttpLogic } from '../../../../../shared/http';

import { ML_NOTIFICATIONS_PATH } from '../../../../routes';

export const TextExpansionErrors = ({
  createError,
  fetchError,
  startError,
}: {
  createError: HttpError | undefined;
  fetchError: HttpError | undefined;
  startError: HttpError | undefined;
}) => {
  const { http } = useValues(HttpLogic);

  // Extract the topmost error in precedence order
  const error: HttpError | undefined = createError ?? startError ?? fetchError;
  if (error === undefined) {
    return null;
  }
  const topError = getErrorsFromHttpResponse(error)[0];

  return (
    <>
      <EuiCallOut
        color="danger"
        iconType="error"
        title={
          createError !== undefined
            ? i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.textExpansionCreateError.title',
                {
                  defaultMessage: 'Error with ELSER deployment',
                }
              )
            : startError !== undefined
            ? i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.textExpansionStartError.title',
                {
                  defaultMessage: 'Error starting ELSER deployment',
                }
              )
            : i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.textExpansionFetchError.title',
                {
                  defaultMessage: 'Error fetching ELSER model',
                }
              )
        }
      >
        <p>{topError}</p>
        <EuiLink href={http.basePath.prepend(ML_NOTIFICATIONS_PATH)} target="_blank">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.textExpansionCreateError.mlNotificationsLink',
            {
              defaultMessage: 'Machine Learning notifications',
            }
          )}
        </EuiLink>
      </EuiCallOut>
    </>
  );
};
