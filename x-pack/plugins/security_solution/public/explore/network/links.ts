/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NETWORK_PATH, SecurityPageName } from '../../../common/constants';
import { NETWORK } from '../../app/translations';
import type { LinkItem } from '../../common/links/types';
import networkPageImg from '../../common/images/network_page.png';

export const links: LinkItem = {
  id: SecurityPageName.network,
  title: NETWORK,
  landingImage: networkPageImg,
  description: i18n.translate('xpack.securitySolution.appLinks.network.description', {
    defaultMessage:
      'Provides key activity metrics in an interactive map as well as event tables that enable interaction with the Timeline.',
  }),
  path: NETWORK_PATH,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.network', {
      defaultMessage: 'Network',
    }),
  ],
  links: [
    {
      id: SecurityPageName.networkDns,
      title: i18n.translate('xpack.securitySolution.appLinks.network.dns', {
        defaultMessage: 'DNS',
      }),
      path: `${NETWORK_PATH}/dns`,
    },
    {
      id: SecurityPageName.networkHttp,
      title: i18n.translate('xpack.securitySolution.appLinks.network.http', {
        defaultMessage: 'HTTP',
      }),
      path: `${NETWORK_PATH}/http`,
    },
    {
      id: SecurityPageName.networkTls,
      title: i18n.translate('xpack.securitySolution.appLinks.network.tls', {
        defaultMessage: 'TLS',
      }),
      path: `${NETWORK_PATH}/tls`,
    },
    {
      id: SecurityPageName.networkAnomalies,
      title: i18n.translate('xpack.securitySolution.appLinks.hosts.anomalies', {
        defaultMessage: 'Anomalies',
      }),
      path: `${NETWORK_PATH}/anomalies`,
      licenseType: 'gold',
    },
    {
      id: SecurityPageName.networkEvents,
      title: i18n.translate('xpack.securitySolution.appLinks.network.events', {
        defaultMessage: 'Events',
      }),
      path: `${NETWORK_PATH}/events`,
    },
  ],
};
