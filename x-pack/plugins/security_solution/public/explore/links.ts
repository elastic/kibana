/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HOSTS_PATH, NETWORK_PATH, SecurityPageName, USERS_PATH } from '../../common/constants';
import { HOSTS, NETWORK, USERS } from '../app/translations';
import type { LinkItem } from '../common/links/types';
import hostsPageImg from '../common/images/hosts_page.png';
import userPageImg from '../common/images/users_page.png';
import networkPageImg from '../common/images/network_page.png';

const networkLinks: LinkItem = {
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

const usersLinks: LinkItem = {
  id: SecurityPageName.users,
  title: USERS,
  landingImage: userPageImg,
  description: i18n.translate('xpack.securitySolution.appLinks.users.description', {
    defaultMessage:
      'A comprehensive overview of user data that enables understanding of authentication and user behavior within your environment.',
  }),
  path: USERS_PATH,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.users', {
      defaultMessage: 'Users',
    }),
  ],
  links: [
    {
      id: SecurityPageName.usersAuthentications,
      title: i18n.translate('xpack.securitySolution.appLinks.users.authentications', {
        defaultMessage: 'Authentications',
      }),
      path: `${USERS_PATH}/authentications`,
    },
    {
      id: SecurityPageName.usersAnomalies,
      title: i18n.translate('xpack.securitySolution.appLinks.users.anomalies', {
        defaultMessage: 'Anomalies',
      }),
      path: `${USERS_PATH}/anomalies`,
      licenseType: 'gold',
    },
    {
      id: SecurityPageName.usersRisk,
      title: i18n.translate('xpack.securitySolution.appLinks.users.risk', {
        defaultMessage: 'User risk',
      }),
      path: `${USERS_PATH}/userRisk`,
    },
    {
      id: SecurityPageName.usersEvents,
      title: i18n.translate('xpack.securitySolution.appLinks.users.events', {
        defaultMessage: 'Events',
      }),
      path: `${USERS_PATH}/events`,
    },
  ],
};

const hostsLinks: LinkItem = {
  id: SecurityPageName.hosts,
  title: HOSTS,
  landingImage: hostsPageImg,
  description: i18n.translate('xpack.securitySolution.landing.threatHunting.hostsDescription', {
    defaultMessage: 'A comprehensive overview of all hosts and host-related security events.',
  }),
  path: HOSTS_PATH,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.appLinks.hosts', {
      defaultMessage: 'Hosts',
    }),
  ],
  links: [
    {
      id: SecurityPageName.uncommonProcesses,
      title: i18n.translate('xpack.securitySolution.appLinks.hosts.uncommonProcesses', {
        defaultMessage: 'Uncommon Processes',
      }),
      path: `${HOSTS_PATH}/uncommonProcesses`,
    },
    {
      id: SecurityPageName.hostsAnomalies,
      title: i18n.translate('xpack.securitySolution.appLinks.hosts.anomalies', {
        defaultMessage: 'Anomalies',
      }),
      path: `${HOSTS_PATH}/anomalies`,
      licenseType: 'gold',
    },
    {
      id: SecurityPageName.hostsEvents,
      title: i18n.translate('xpack.securitySolution.appLinks.hosts.events', {
        defaultMessage: 'Events',
      }),
      path: `${HOSTS_PATH}/events`,
    },
    {
      id: SecurityPageName.hostsRisk,
      title: i18n.translate('xpack.securitySolution.appLinks.hosts.risk', {
        defaultMessage: 'Host risk',
      }),
      path: `${HOSTS_PATH}/hostRisk`,
    },
    {
      id: SecurityPageName.sessions,
      title: i18n.translate('xpack.securitySolution.appLinks.hosts.sessions', {
        defaultMessage: 'Sessions',
      }),
      path: `${HOSTS_PATH}/sessions`,
      isBeta: false,
      licenseType: 'enterprise',
    },
  ],
};

export const exploreLinks = [hostsLinks, networkLinks, usersLinks];
