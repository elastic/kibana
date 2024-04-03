/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';

function getNoDataConfigDetails({
  basePath,
  isServerless,
  hasApmIntegrations,
}: {
  basePath?: string;
  isServerless?: boolean;
  hasApmIntegrations?: boolean;
}) {
  const description = i18n.translate(
    'xpack.apm.ux.overview.agent.description',
    {
      defaultMessage:
        'Use APM agents to collect APM data. We make it easy with agents for many popular languages.',
    }
  );

  const addDataTitle = i18n.translate(
    'xpack.apm.noDataConfig.addDataButtonLabel',
    {
      defaultMessage: 'Add data',
    }
  );

  if (isServerless) {
    return {
      title: addDataTitle,
      href: `${basePath}/app/apm/onboarding`,
      description,
    };
  }

  if (hasApmIntegrations) {
    return {
      title: addDataTitle,
      href: `${basePath}/app/apm/tutorial`,
      description,
    };
  }

  return {
    title: i18n.translate(
      'xpack.apm.noDataConfig.addApmIntegrationButtonLabel',
      { defaultMessage: 'Add the APM integration' }
    ),
    href: `${basePath}/app/integrations/detail/apm/overview`,
    description,
  };
}

export function getNoDataConfig({
  docsLink,
  shouldBypassNoDataScreen,
  loading,
  basePath,
  hasApmData,
  hasApmIntegrations,
  isServerless,
}: {
  docsLink: string;
  shouldBypassNoDataScreen: boolean;
  loading: boolean;
  basePath?: string;
  hasApmData?: boolean;
  hasApmIntegrations?: boolean;
  isServerless?: boolean;
}): NoDataConfig | undefined {
  // don't show "no data screen" when there is APM data or it should be bypassed
  if (hasApmData || shouldBypassNoDataScreen || loading) {
    return;
  }
  const noDataConfigDetails = getNoDataConfigDetails({
    basePath,
    isServerless,
    hasApmIntegrations,
  });

  return {
    solution: i18n.translate('xpack.apm.noDataConfig.solutionName', {
      defaultMessage: 'Observability',
    }),
    action: {
      elasticAgent: {
        title: noDataConfigDetails.title,
        description: noDataConfigDetails.description,
        href: noDataConfigDetails.href,
      },
    },
    docsLink,
  };
}
