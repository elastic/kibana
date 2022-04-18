/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useContext } from 'react';
import { useSelector } from 'react-redux';
import { KibanaPageTemplateProps, useKibana } from '@kbn/kibana-react-plugin/public';
import { UptimeSettingsContext } from '../contexts';
import { ClientPluginsStart } from './plugin';
import { indexStatusSelector } from '../state/selectors';

export function useNoDataConfig(): KibanaPageTemplateProps['noDataConfig'] {
  const { basePath } = useContext(UptimeSettingsContext);

  const {
    services: { docLinks },
  } = useKibana<ClientPluginsStart>();

  const { data } = useSelector(indexStatusSelector);

  // Returns no data config when there is no historical data
  if (data && !data.indexExists) {
    return {
      solution: i18n.translate('xpack.uptime.noDataConfig.solutionName', {
        defaultMessage: 'Observability',
      }),
      actions: {
        beats: {
          title: i18n.translate('xpack.uptime.noDataConfig.beatsCard.title', {
            defaultMessage: 'Add monitors with Heartbeat',
          }),
          description: i18n.translate('xpack.uptime.noDataConfig.beatsCard.description', {
            defaultMessage:
              'Proactively monitor the availability of your sites and services. Receive alerts and resolve issues faster to optimize your users experience.',
          }),
          href: basePath + `/app/home#/tutorial/uptimeMonitors`,
        },
      },
      docsLink: docLinks!.links.observability.guide,
    };
  }
}
