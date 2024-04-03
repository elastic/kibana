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

import { HttpLogic } from '../../../../../../shared/http';

import { SendEnterpriseSearchTelemetry } from '../../../../../../shared/telemetry';
import { ML_NOTIFICATIONS_PATH } from '../../../../../routes';

export const TextExpansionErrors = ({ error }: { error: { title: string; message: string } }) => {
  const { http } = useValues(HttpLogic);

  return (
    <>
      <SendEnterpriseSearchTelemetry action="error" metric="textExpansionModel-error" />
      <EuiCallOut color="danger" iconType="error" title={error.title}>
        <p>{error.message}</p>
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
