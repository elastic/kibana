/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

export function InfraOverview() {
  return (
    <EuiEmptyPrompt
      icon={<EuiLoadingLogo logo="logoMetrics" size="xl" />}
      title={
        <h2>
          {i18n.translate('xpack.apm.infra.announcement', {
            defaultMessage: 'Infrastructure data coming soon',
          })}
        </h2>
      }
    />
  );
}
