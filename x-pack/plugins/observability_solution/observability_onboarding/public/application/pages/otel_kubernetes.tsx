/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { OtelKubernetesPanel } from '../quickstart_flows/otel_kubernetes/otel_kubernetes_panel';
import { PageTemplate } from './template';
import { CustomHeader } from '../header';

export const OtelKubernetesPage = () => (
  <PageTemplate
    customHeader={
      <CustomHeader
        logo="opentelemetry"
        headlineCopy={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.otelKubernetes.text',
          {
            defaultMessage: 'OpenTelemetry for Kubernetes monitoring',
          }
        )}
        captionCopy={i18n.translate(
          'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.otelKubernetes.caption.description',
          {
            defaultMessage: 'Monitor your Kubernetes cluster using OpenTelemetry',
          }
        )}
      />
    }
  >
    <OtelKubernetesPanel />
  </PageTemplate>
);
