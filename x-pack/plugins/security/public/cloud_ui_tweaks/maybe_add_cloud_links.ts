/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, defer, filter, map, of } from 'rxjs';

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ChromeStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { AuthenticationServiceStart, SecurityNavControlServiceStart } from '..';
import { createUserMenuLinks } from './user_menu_links';

export interface MaybeAddCloudLinksDeps {
  authc: AuthenticationServiceStart;
  chrome: ChromeStart;
  cloud: CloudStart;
  navControlService: SecurityNavControlServiceStart;
}

export function maybeAddCloudLinks({
  authc,
  chrome,
  cloud,
  navControlService,
}: MaybeAddCloudLinksDeps): void {
  if (cloud.isCloudEnabled) {
    defer(() => authc.getCurrentUser())
      .pipe(
        // Check if user is a cloud user.
        map((user) => user.elastic_cloud_user),
        // If user is not defined due to an unexpected error, then fail *open*.
        catchError(() => of(true)),
        filter((isElasticCloudUser) => isElasticCloudUser === true),
        map(() => {
          if (cloud.deploymentUrl) {
            chrome.setCustomNavLink({
              title: i18n.translate('xpack.security.deploymentLinkLabel', {
                defaultMessage: 'Manage this deployment',
              }),
              euiIconType: 'logoCloud',
              href: cloud.deploymentUrl,
            });
          }
          const userMenuLinks = createUserMenuLinks(cloud);
          navControlService.addUserMenuLinks(userMenuLinks);
        })
      )
      .subscribe();
  }
}
