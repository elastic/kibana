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
  basePath,
  hasData,
  hasApmIntegrations,
}: {
  docsLink: string;
  basePath?: string;
  hasData?: boolean;
  hasApmIntegrations?: boolean;
}): KibanaPageTemplateProps['noDataConfig'] {
  // Returns no data config when there is no historical data
  if (hasData === false) {
    const title = hasApmIntegrations
      ? i18n.translate('xpack.apm.noDataConfig.addDataButtonLabel', {
          defaultMessage: 'Add data',
        })
      : i18n.translate('xpack.apm.noDataConfig.addApmIntegrationButtonLabel', {
          defaultMessage: 'Add the APM integration',
        });

    return {
      solution: i18n.translate('xpack.apm.noDataConfig.solutionName', {
        defaultMessage: 'Observability',
      }),
      actions: {
        elasticAgent: {
          title,
          description: i18n.translate(
            'xpack.apm.ux.overview.agent.description',
            {
              defaultMessage:
                'Use APM agents to collect APM data. We make it easy with agents for many popular languages.',
            }
          ),
          href: `${basePath}/app/home#/tutorial/apm`,
        },
      },
      docsLink,
    };
  }
}
