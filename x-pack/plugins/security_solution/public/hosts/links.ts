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
  label: HOSTS,
  url: HOSTS_PATH,
  globalNavEnabled: true,
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.hosts', {
      defaultMessage: 'Hosts',
    }),
  ],
  globalSearchEnabled: true,
  globalNavOrder: 9002,
  items: [
    {
      id: SecurityPageName.hostsAuthentications,
      label: i18n.translate('xpack.securitySolution.search.hosts.authentications', {
        defaultMessage: 'Authentications',
      }),
      url: `${HOSTS_PATH}/authentications`,
      hideWhenExperimentalKey: 'usersEnabled',
    },
    {
      id: SecurityPageName.uncommonProcesses,
      label: i18n.translate('xpack.securitySolution.search.hosts.uncommonProcesses', {
        defaultMessage: 'Uncommon Processes',
      }),
      url: `${HOSTS_PATH}/uncommonProcesses`,
    },
    {
      id: SecurityPageName.hostsAnomalies,
      label: i18n.translate('xpack.securitySolution.search.hosts.anomalies', {
        defaultMessage: 'Anomalies',
      }),
      url: `${HOSTS_PATH}/anomalies`,
      isPremium: true,
    },
    {
      id: SecurityPageName.hostsEvents,
      label: i18n.translate('xpack.securitySolution.search.hosts.events', {
        defaultMessage: 'Events',
      }),
      url: `${HOSTS_PATH}/events`,
    },
    {
      id: SecurityPageName.hostsExternalAlerts,
      label: i18n.translate('xpack.securitySolution.search.hosts.externalAlerts', {
        defaultMessage: 'External Alerts',
      }),
      url: `${HOSTS_PATH}/externalAlerts`,
    },
    {
      id: SecurityPageName.usersRisk,
      label: i18n.translate('xpack.securitySolution.search.hosts.risk', {
        defaultMessage: 'Hosts by risk',
      }),
      url: `${HOSTS_PATH}/hostRisk`,
      experimentalKey: 'riskyHostsEnabled',
    },
    {
      id: SecurityPageName.sessions,
      label: i18n.translate('xpack.securitySolution.search.hosts.sessions', {
        defaultMessage: 'Sessions',
      }),
      url: `${HOSTS_PATH}/sessions`,
    },
  ],
};
