/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { CustomHeaderSection, SupportedPath } from './types';

export const SUPPORTED_SLUGS: Record<string, SupportedPath> = {
  KUBERNETES: '/kubernetes',
  OTEL: '/otel-logs',
  SYSTEM: '/auto-detect',
};

export const headerContent: Record<string, CustomHeaderSection> = {
  [SUPPORTED_SLUGS.KUBERNETES]: {
    logo: 'kubernetes',
    headlineCopy: i18n.translate(
      'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.kubernetes.text',
      {
        defaultMessage: 'Setting up Kubernetes with Elastic Agent',
      }
    ),
    captionCopy: i18n.translate(
      'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.kubernetes.caption.description',
      {
        defaultMessage:
          'This installation is tailored for configuring and collecting metrics and logs by deploying a new Elastic Agent within your host.',
      }
    ),
  },
  [SUPPORTED_SLUGS.OTEL]: {
    logo: 'opentelemetry',
    headlineCopy: i18n.translate(
      'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.otel.text',
      {
        defaultMessage: 'OpenTelemetry',
      }
    ),
    captionCopy: i18n.translate(
      'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.otel.description',
      {
        defaultMessage: 'Collect logs and host metrics using the OTel collector.',
      }
    ),
  },
  [SUPPORTED_SLUGS.SYSTEM]: {
    euiIconType: 'consoleApp',
    headlineCopy: i18n.translate(
      'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.system.text',
      {
        defaultMessage: 'Auto-detect logs and metrics',
      }
    ),
    captionCopy: i18n.translate(
      'xpack.observability_onboarding.experimentalOnboardingFlow.customHeader.system.description',
      {
        defaultMessage: 'This installation scans your host and auto-detects log and metric files.',
      }
    ),
  },
};

export function customHeaderProps(pathname: SupportedPath | string): CustomHeaderSection | null {
  if (pathname.startsWith(SUPPORTED_SLUGS.KUBERNETES)) {
    return headerContent[SUPPORTED_SLUGS.KUBERNETES];
  } else if (pathname.startsWith(SUPPORTED_SLUGS.OTEL)) {
    return headerContent[SUPPORTED_SLUGS.OTEL];
  } else if (pathname.startsWith(SUPPORTED_SLUGS.SYSTEM)) {
    return headerContent[SUPPORTED_SLUGS.SYSTEM];
  }

  return null;
}
