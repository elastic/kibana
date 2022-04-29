/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { HOSTS_PATH, SecurityPageName } from '../../common/constants';
import { HOSTS } from '../app/translations';
import { LinkItem } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.hosts,
  title: HOSTS,
  path: HOSTS_PATH,
  globalNavEnabled: true,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.hosts', {
      defaultMessage: 'Hosts',
    }),
  ],
  globalSearchEnabled: true,
  globalNavOrder: 9002,
  links: [
    {
      id: SecurityPageName.hostsAuthentications,
      title: i18n.translate('xpack.securitySolution.search.hosts.authentications', {
        defaultMessage: 'Authentications',
      }),
      path: `${HOSTS_PATH}/authentications`,
      hideWhenExperimentalKey: 'usersEnabled',
    },
    {
      id: SecurityPageName.uncommonProcesses,
      title: i18n.translate('xpack.securitySolution.search.hosts.uncommonProcesses', {
        defaultMessage: 'Uncommon Processes',
      }),
      path: `${HOSTS_PATH}/uncommonProcesses`,
    },
    {
      id: SecurityPageName.hostsAnomalies,
      title: i18n.translate('xpack.securitySolution.search.hosts.anomalies', {
        defaultMessage: 'Anomalies',
      }),
      path: `${HOSTS_PATH}/anomalies`,
      isPremium: true,
    },
    {
      id: SecurityPageName.hostsEvents,
      title: i18n.translate('xpack.securitySolution.search.hosts.events', {
        defaultMessage: 'Events',
      }),
      path: `${HOSTS_PATH}/events`,
    },
    {
      id: SecurityPageName.hostsExternalAlerts,
      title: i18n.translate('xpack.securitySolution.search.hosts.externalAlerts', {
        defaultMessage: 'External Alerts',
      }),
      path: `${HOSTS_PATH}/externalAlerts`,
    },
    {
      id: SecurityPageName.hostsRisk,
      title: i18n.translate('xpack.securitySolution.search.hosts.risk', {
        defaultMessage: 'Hosts by risk',
      }),
      path: `${HOSTS_PATH}/hostRisk`,
      experimentalKey: 'riskyHostsEnabled',
    },
    {
      id: SecurityPageName.sessions,
      title: i18n.translate('xpack.securitySolution.search.hosts.sessions', {
        defaultMessage: 'Sessions',
      }),
      path: `${HOSTS_PATH}/sessions`,
      isBeta: true,
    },
  ],
};
