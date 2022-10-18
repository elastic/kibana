/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SecurityPageName, USERS_PATH } from '../../../common/constants';
import { USERS } from '../../app/translations';
import type { LinkItem } from '../../common/links/types';
import userPageImg from '../../common/images/users_page.png';

export const links: LinkItem = {
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
