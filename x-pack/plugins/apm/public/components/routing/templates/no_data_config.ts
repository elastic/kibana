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
}: {
  docsLink: string;
  basePath?: string;
  hasData?: boolean;
}): KibanaPageTemplateProps['noDataConfig'] {
  // Returns no data config when there is no historical data
  if (hasData === false) {
    return {
      solution: i18n.translate('xpack.apm.noDataConfig.solutionName', {
        defaultMessage: 'Observability',
      }),
      actions: {
        beats: {
          title: i18n.translate('xpack.apm.noDataConfig.beatsCard.title', {
            defaultMessage: 'Add data with APM agents',
          }),
          description: i18n.translate(
            'xpack.apm.noDataConfig.beatsCard.description',
            {
              defaultMessage:
                'Use APM agents to collect APM data. We make it easy with agents for many popular languages.',
            }
          ),
          href: basePath + `/app/home#/tutorial/apm`,
        },
      },
      docsLink,
    };
  }
}
