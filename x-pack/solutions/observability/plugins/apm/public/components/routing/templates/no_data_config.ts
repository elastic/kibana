/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { NoDataConfig } from '@kbn/shared-ux-page-kibana-template';

function getNoDataConfigDetails({
  addDataUrl,
}: {
  basePath?: string;
  isServerless?: boolean;
  hasApmIntegrations?: boolean;
  addDataUrl: string;
}) {
  return {
    title: i18n.translate('xpack.apm.noDataConfig.addDataButtonLabel', {
      defaultMessage: 'Add data',
    }),
    href: addDataUrl,
    description: i18n.translate('xpack.apm.ux.overview.agent.description', {
      defaultMessage:
        'Use APM agents to collect APM data. We make it easy with agents for many popular languages.',
    }),
  };
}

export function getNoDataConfig({
  docsLink,
  shouldBypassNoDataScreen,
  loading,
  addDataUrl,
  hasApmData,
}: {
  docsLink: string;
  shouldBypassNoDataScreen: boolean;
  loading: boolean;
  addDataUrl: string;
  hasApmData?: boolean;
}): NoDataConfig | undefined {
  // don't show "no data screen" when there is APM data or it should be bypassed
  if (hasApmData || shouldBypassNoDataScreen || loading) {
    return;
  }
  const noDataConfigDetails = getNoDataConfigDetails({
    addDataUrl,
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
