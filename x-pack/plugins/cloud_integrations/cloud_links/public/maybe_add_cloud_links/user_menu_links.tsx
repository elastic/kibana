/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SecurityPluginStart, UserMenuLink } from '@kbn/security-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { ThemeDarkModeToggle } from './theme_darkmode_toggle';

export const createUserMenuLinks = ({
  core,
  cloud,
  security,
}: {
  core: CoreStart;
  cloud: CloudStart;
  security: SecurityPluginStart;
}): UserMenuLink[] => {
  const { profileUrl, billingUrl, organizationUrl } = cloud;

  const userMenuLinks = [] as UserMenuLink[];

  if (profileUrl) {
    userMenuLinks.push({
      label: i18n.translate('xpack.cloudLinks.userMenuLinks.profileLinkText', {
        defaultMessage: 'Profile',
      }),
      iconType: 'user',
      href: profileUrl,
      order: 100,
      setAsProfile: true,
    });
  }

  if (billingUrl) {
    userMenuLinks.push({
      label: i18n.translate('xpack.cloudLinks.userMenuLinks.billingLinkText', {
        defaultMessage: 'Billing',
      }),
      iconType: 'visGauge',
      href: billingUrl,
      order: 200,
    });
  }

  if (organizationUrl) {
    userMenuLinks.push({
      label: i18n.translate('xpack.cloudLinks.userMenuLinks.organizationLinkText', {
        defaultMessage: 'Organization',
      }),
      iconType: 'gear',
      href: organizationUrl,
      order: 300,
    });
  }

  userMenuLinks.push({
    content: <ThemeDarkModeToggle core={core} security={security} />,
    order: 400,
    label: '',
    iconType: '',
    href: '',
  });

  return userMenuLinks;
};
