/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { UserMenuLink } from '../../security/public';
import { CloudConfigType } from '.';
import { getFullCloudUrl } from './utils';

export const createUserMenuLinks = (config: CloudConfigType): UserMenuLink[] => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { profile_url, organization_url, base_url } = config;
  const userMenuLinks = [] as UserMenuLink[];

  if (base_url && profile_url) {
    userMenuLinks.push({
      label: i18n.translate('xpack.cloud.userMenuLinks.profileLinkText', {
        defaultMessage: 'Profile',
      }),
      iconType: 'user',
      href: getFullCloudUrl(base_url, profile_url),
      order: 100,
      setAsProfile: true,
    });
  }

  if (base_url && organization_url) {
    userMenuLinks.push({
      label: i18n.translate('xpack.cloud.userMenuLinks.accountLinkText', {
        defaultMessage: 'Account & Billing',
      }),
      iconType: 'gear',
      href: getFullCloudUrl(base_url, organization_url),
      order: 200,
    });
  }

  return userMenuLinks;
};
