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
  label: USERS,
  url: USERS_PATH,
  globalNavEnabled: true,
  experimentalKey: 'usersEnabled',
  globalSearchKeywords: [
    i18n.translate('xpack.securitySolution.search.users', {
      defaultMessage: 'Users',
    }),
  ],
  globalNavOrder: 9004,
  items: [
    {
      id: SecurityPageName.usersAuthentications,
      label: i18n.translate('xpack.securitySolution.search.users.authentications', {
        defaultMessage: 'Authentications',
      }),
      url: `${USERS_PATH}/authentications`,
    },
    {
      id: SecurityPageName.usersAnomalies,
      label: i18n.translate('xpack.securitySolution.search.users.anomalies', {
        defaultMessage: 'Anomalies',
      }),
      url: `${USERS_PATH}/anomalies`,
      isPremium: true,
    },
    {
      id: SecurityPageName.usersRisk,
      label: i18n.translate('xpack.securitySolution.search.users.risk', {
        defaultMessage: 'Users by risk',
      }),
      url: `${USERS_PATH}/userRisk`,
      experimentalKey: 'riskyUsersEnabled',
    },
    {
      id: SecurityPageName.usersEvents,
      label: i18n.translate('xpack.securitySolution.search.users.events', {
        defaultMessage: 'Events',
      }),
      url: `${USERS_PATH}/events`,
    },
    {
      id: SecurityPageName.usersExternalAlerts,
      label: i18n.translate('xpack.securitySolution.search.users.externalAlerts', {
        defaultMessage: 'External Alerts',
      }),
      url: `${USERS_PATH}/externalAlerts`,
    },
  ],
};
