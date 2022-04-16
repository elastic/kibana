/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { IBasePath } from '@kbn/core/public';
import { KibanaPageTemplateProps } from '@kbn/kibana-react-plugin/public';

export function getNoDataConfig({
  docsLink,
  basePath,
  hasData,
}: {
  docsLink: string;
  basePath: IBasePath;
  hasData?: boolean;
}): KibanaPageTemplateProps['noDataConfig'] {
  if (hasData === false) {
    return {
      solution: i18n.translate('xpack.observability.noDataConfig.solutionName', {
        defaultMessage: 'Observability',
      }),
      actions: {
        elasticAgent: {
          title: i18n.translate('xpack.observability.noDataConfig.beatsCard.title', {
            defaultMessage: 'Add integrations',
          }),
          description: i18n.translate('xpack.observability.noDataConfig.beatsCard.description', {
            defaultMessage:
              'Use Beats and APM agents to send observability data to Elasticsearch. We make it easy with support for many popular systems, apps, and languages.',
          }),
          href: basePath.prepend(`/app/integrations/browse`),
        },
      },
      docsLink,
    };
  }
}
