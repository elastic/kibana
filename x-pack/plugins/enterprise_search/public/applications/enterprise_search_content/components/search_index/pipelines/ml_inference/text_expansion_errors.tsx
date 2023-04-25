/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues } from 'kea';

import { EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { getErrorsFromHttpResponse } from '../../../../../shared/flash_messages/handle_api_errors';
import { HttpLogic } from '../../../../../shared/http';
import { CreateTextExpansionModelApiLogic } from '../../../../api/ml_models/text_expansion/create_text_expansion_model_api_logic';
import { FetchTextExpansionModelApiLogic } from '../../../../api/ml_models/text_expansion/fetch_text_expansion_model_api_logic';

import { ML_NOTIFICATIONS_PATH } from '../../../../routes';

export const TextExpansionErrors = () => {
  const { http } = useValues(HttpLogic);
  const { error: createError } = useValues(CreateTextExpansionModelApiLogic);
  const { error: fetchError } = useValues(FetchTextExpansionModelApiLogic);

  if (createError === undefined && fetchError === undefined) return null;

  const error = getErrorsFromHttpResponse(createError ?? fetchError)[0];

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
            : i18n.translate(
                'xpack.enterpriseSearch.content.indices.pipelines.textExpansionFetchError.title',
                {
                  defaultMessage: 'Error fetching ELSER model',
                }
              )
        }
      >
        <p>{error}</p>
        <EuiLink href={http.basePath.prepend(ML_NOTIFICATIONS_PATH)} target="_blank">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.textExpansionCreateError.mlNotificationsLink',
            {
              defaultMessage: 'Machine Learning notifications',
            }
          )}
        </EuiLink>
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
