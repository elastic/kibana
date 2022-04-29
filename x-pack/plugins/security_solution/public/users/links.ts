/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SecurityPageName, USERS_PATH } from '../../common/constants';
import { USERS } from '../app/translations';
import { LinkItem } from '../common/links/types';

export const links: LinkItem = {
  id: SecurityPageName.users,
  title: USERS,
  path: USERS_PATH,
  globalNavEnabled: true,
  experimentalKey: 'usersEnabled',
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.users', {
      defaultMessage: 'Users',
    }),
  ],
  globalNavOrder: 9004,
  links: [
    {
      id: SecurityPageName.usersAuthentications,
      title: i18n.translate('xpack.securitySolution.search.users.authentications', {
        defaultMessage: 'Authentications',
      }),
      path: `${USERS_PATH}/authentications`,
    },
    {
      id: SecurityPageName.usersAnomalies,
      title: i18n.translate('xpack.securitySolution.search.users.anomalies', {
        defaultMessage: 'Anomalies',
      }),
      path: `${USERS_PATH}/anomalies`,
      isPremium: true,
    },
    {
      id: SecurityPageName.usersRisk,
      title: i18n.translate('xpack.securitySolution.search.users.risk', {
        defaultMessage: 'Users by risk',
      }),
      path: `${USERS_PATH}/userRisk`,
      experimentalKey: 'riskyUsersEnabled',
    },
    {
      id: SecurityPageName.usersEvents,
      title: i18n.translate('xpack.securitySolution.search.users.events', {
        defaultMessage: 'Events',
      }),
      path: `${USERS_PATH}/events`,
    },
    {
      id: SecurityPageName.usersExternalAlerts,
      title: i18n.translate('xpack.securitySolution.search.users.externalAlerts', {
        defaultMessage: 'External Alerts',
      }),
      path: `${USERS_PATH}/externalAlerts`,
    },
  ],
};
