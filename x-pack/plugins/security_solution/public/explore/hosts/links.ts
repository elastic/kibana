/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { HOSTS_PATH, SecurityPageName } from '../../../common/constants';
import { HOSTS } from '../../app/translations';
import type { LinkItem } from '../../common/links/types';
import hostsPageImg from '../../common/images/hosts_page.png';

export const links: LinkItem = {
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
