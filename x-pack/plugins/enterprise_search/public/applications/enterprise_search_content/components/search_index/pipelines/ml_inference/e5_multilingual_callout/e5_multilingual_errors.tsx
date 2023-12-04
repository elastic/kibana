/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EuiLinkTo } from '../../../../../../shared/react_router_helpers';

import { SendEnterpriseSearchTelemetry } from '../../../../../../shared/telemetry';

import { ML_NOTIFICATIONS_PATH } from '../../../../../routes';

export function E5MultilingualErrors({ error }: { error: { title: string; message: string } }) {
  return (
    <>
      <SendEnterpriseSearchTelemetry action="error" metric="e5MultilingualModel-error" />
      <EuiCallOut color="danger" iconType="error" title={error.title}>
        <p>{error.message}</p>
        <EuiLinkTo to={ML_NOTIFICATIONS_PATH} target="_blank">
          {i18n.translate(
            'xpack.enterpriseSearch.content.indices.pipelines.e5MultilingualCreateError.mlNotificationsLink',
            {
              defaultMessage: 'Machine Learning notifications',
            }
          )}
        </EuiLinkTo>
      </EuiCallOut>
    </>
  );
}
