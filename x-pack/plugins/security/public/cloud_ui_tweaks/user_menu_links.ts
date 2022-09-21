/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudStart } from '@kbn/cloud-plugin/public';
import { i18n } from '@kbn/i18n';

import type { UserMenuLink } from '..';

export const createUserMenuLinks = (cloud: CloudStart): UserMenuLink[] => {
  const { profileUrl, organizationUrl } = cloud;
  const userMenuLinks = [] as UserMenuLink[];

  if (profileUrl) {
    userMenuLinks.push({
      label: i18n.translate('xpack.security.userMenuLinks.profileLinkText', {
        defaultMessage: 'Edit profile',
      }),
      iconType: 'user',
      href: profileUrl,
      order: 100,
      setAsProfile: true,
    });
  }

  if (organizationUrl) {
    userMenuLinks.push({
      label: i18n.translate('xpack.security.userMenuLinks.accountLinkText', {
        defaultMessage: 'Account & Billing',
      }),
      iconType: 'gear',
      href: organizationUrl,
      order: 200,
    });
  }

  return userMenuLinks;
};
