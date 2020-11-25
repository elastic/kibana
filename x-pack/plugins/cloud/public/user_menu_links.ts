/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { UserMenuLink } from '../../security/public';
import { CloudConfigType } from '.';

export const createUserMenuLinks = (config: CloudConfigType): UserMenuLink[] => {
  const { resetPasswordUrl, accountUrl } = config;
  const userMenuLinks = [] as UserMenuLink[];

  if (resetPasswordUrl) {
    userMenuLinks.push({
      label: i18n.translate('xpack.cloud.userMenuLinks.profileLinkText', {
        defaultMessage: 'Cloud profile',
      }),
      iconType: 'logoCloud',
      href: resetPasswordUrl,
      order: 100,
    });
  }

  if (accountUrl) {
    userMenuLinks.push({
      label: i18n.translate('xpack.cloud.userMenuLinks.accountLinkText', {
        defaultMessage: 'Account & Billing',
      }),
      iconType: 'gear',
      href: accountUrl,
      order: 200,
    });
  }

  return userMenuLinks;
};
