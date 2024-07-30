/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { CustomHeaderSection } from './custom_header';

export function OtelHeader() {
  return (
    <CustomHeaderSection
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
          defaultMessage: 'Collect logs and host metrics using the OTel collector.',
        }
      )}
    />
  );
}
