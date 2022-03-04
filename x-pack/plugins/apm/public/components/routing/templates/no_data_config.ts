/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { KibanaPageTemplateProps } from '../../../../../../../src/plugins/kibana_react/public';

export function getNoDataConfig({
  docsLink,
  shouldBypassNoDataScreen,
  loading,
  basePath,
  hasApmData,
  hasApmIntegrations,
}: {
  docsLink: string;
  shouldBypassNoDataScreen: boolean;
  loading: boolean;
  basePath?: string;
  hasApmData?: boolean;
  hasApmIntegrations?: boolean;
}): KibanaPageTemplateProps['noDataConfig'] {
  // don't show "no data screen" when there is APM data or it should be bypassed
  if (hasApmData || shouldBypassNoDataScreen || loading) {
    return;
  }
  const noDataConfigDetails = hasApmIntegrations
    ? {
        title: i18n.translate('xpack.apm.noDataConfig.addDataButtonLabel', {
          defaultMessage: 'Add data',
        }),
        href: `${basePath}/app/home#/tutorial/apm`,
      }
    : {
        title: i18n.translate(
          'xpack.apm.noDataConfig.addApmIntegrationButtonLabel',
          {
            defaultMessage: 'Add the APM integration',
          }
        ),
        href: `${basePath}/app/integrations/detail/apm/overview`,
      };

  return {
    solution: i18n.translate('xpack.apm.noDataConfig.solutionName', {
      defaultMessage: 'Observability',
    }),
    actions: {
      elasticAgent: {
        title: noDataConfigDetails.title,
        description: i18n.translate('xpack.apm.ux.overview.agent.description', {
          defaultMessage:
            'Use APM agents to collect APM data. We make it easy with agents for many popular languages.',
        }),
        href: noDataConfigDetails.href,
      },
    },
    docsLink,
  };
}
