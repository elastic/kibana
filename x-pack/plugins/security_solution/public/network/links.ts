/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { NETWORK_PATH, SecurityPageName } from '../../common/constants';
import { NETWORK } from '../app/translations';
import { LinkItem } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.network,
  label: NETWORK,
  url: NETWORK_PATH,
  globalNavEnabled: true,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.network', {
      defaultMessage: 'Network',
    }),
  ],
  globalNavOrder: 9003,
  items: [
    {
      id: SecurityPageName.networkDns,
      label: i18n.translate('xpack.securitySolution.search.network.dns', {
        defaultMessage: 'DNS',
      }),
      url: `${NETWORK_PATH}/dns`,
    },
    {
      id: SecurityPageName.networkHttp,
      label: i18n.translate('xpack.securitySolution.search.network.http', {
        defaultMessage: 'HTTP',
      }),
      url: `${NETWORK_PATH}/http`,
    },
    {
      id: SecurityPageName.networkTls,
      label: i18n.translate('xpack.securitySolution.search.network.tls', {
        defaultMessage: 'TLS',
      }),
      url: `${NETWORK_PATH}/tls`,
    },
    {
      id: SecurityPageName.networkExternalAlerts,
      label: i18n.translate('xpack.securitySolution.search.network.externalAlerts', {
        defaultMessage: 'External Alerts',
      }),
      url: `${NETWORK_PATH}/external-alerts`,
    },
    {
      id: SecurityPageName.networkAnomalies,
      label: i18n.translate('xpack.securitySolution.search.hosts.anomalies', {
        defaultMessage: 'Anomalies',
      }),
      url: `${NETWORK_PATH}/anomalies`,
      isPremium: true,
    },
  ],
};
