/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { CustomHeaderSection } from './custom_header';

export function KubernetesHeader() {
  return (
    <CustomHeaderSection
      logo="kubernetes"
      headlineCopy={i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.kubernetes.text',
        {
          defaultMessage: 'Setting up Kubernetes with Elastic Agent',
        }
      )}
      captionCopy={i18n.translate(
        'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.kubernetes.caption.description',
        {
          defaultMessage:
            'This installation is tailored for configuring and collecting metrics and logs by deploying a new Elastic Agent within your host.',
        }
      )}
    />
  );
}
