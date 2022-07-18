/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { UserMenuLink } from '@kbn/security-plugin/public';
import { CloudConfigType } from '.';
import { getFullCloudUrl } from './utils';

export const createUserMenuLinks = (config: CloudConfigType): UserMenuLink[] => {
  const { profile_url: profileUrl, organization_url: organizationUrl, base_url: baseUrl } = config;
  const userMenuLinks = [] as UserMenuLink[];

  if (baseUrl && profileUrl) {
    userMenuLinks.push({
      label: i18n.translate('xpack.cloud.userMenuLinks.profileLinkText', {
        defaultMessage: 'Profile',
      }),
      iconType: 'user',
      href: getFullCloudUrl(baseUrl, profileUrl),
      order: 100,
      setAsProfile: true,
    });
  }

  if (baseUrl && organizationUrl) {
    userMenuLinks.push({
      label: i18n.translate('xpack.cloud.userMenuLinks.accountLinkText', {
        defaultMessage: 'Account & Billing',
      }),
      iconType: 'gear',
      href: getFullCloudUrl(baseUrl, organizationUrl),
      order: 200,
    });
  }

  return userMenuLinks;
};
