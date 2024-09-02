/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { PageTemplate } from './template';
import { CustomHeader } from '../header';
import { OtelLogsPanel } from '../quickstart_flows/otel_logs';

export const OtelLogsPage = () => (
  <PageTemplate
    customHeader={
      <CustomHeader
        logo="opentelemetry"
        headlineCopy={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.otel.text',
          {
            defaultMessage: 'OpenTelemetry',
          }
        )}
        captionCopy={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.otel.description',
          {
            defaultMessage:
              'Collect logs and host metrics using the Elastic distribution of the OTel collector.',
          }
        )}
        isTechnicalPreview={true}
      />
    }
  >
    <OtelLogsPanel />
  </PageTemplate>
);
