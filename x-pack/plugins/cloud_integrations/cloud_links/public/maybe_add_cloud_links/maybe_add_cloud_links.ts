/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, defer, filter, map, of, combineLatest } from 'rxjs';

import { i18n } from '@kbn/i18n';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { ChromeStart } from '@kbn/core/public';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { createUserMenuLinks } from './user_menu_links';
import { createHelpMenuLinks } from './help_menu_links';

export interface MaybeAddCloudLinksDeps {
  security: SecurityPluginStart;
  chrome: ChromeStart;
  cloud: CloudStart;
  docLinks: DocLinksStart;
  uiSettingsClient: IUiSettingsClient;
}

export function maybeAddCloudLinks({
  security,
  chrome,
  cloud,
  docLinks,
  uiSettingsClient,
}: MaybeAddCloudLinksDeps): void {
  const userObservable = defer(() => security.authc.getCurrentUser()).pipe(
    // Check if user is a cloud user.
    map((user) => user.elastic_cloud_user),
    // If user is not defined due to an unexpected error, then fail *open*.
    catchError(() => of(true)),
    filter((isElasticCloudUser) => isElasticCloudUser === true),
    map(() => {
      if (cloud.deploymentUrl) {
        chrome.setCustomNavLink({
          title: i18n.translate('xpack.cloudLinks.deploymentLinkLabel', {
            defaultMessage: 'Manage this deployment',
          }),
          euiIconType: 'logoCloud',
          href: cloud.deploymentUrl,
        });
      }
      const userMenuLinks = createUserMenuLinks({ cloud, security, uiSettingsClient });
      security.navControlService.addUserMenuLinks(userMenuLinks);
    })
  );

  const helpObservable = chrome.getHelpSupportUrl$();

  if (cloud.isCloudEnabled) {
    combineLatest({ user: userObservable, helpSupportUrl: helpObservable }).subscribe(
      ({ helpSupportUrl }) => {
        const helpMenuLinks = createHelpMenuLinks({
          docLinks,
          helpSupportUrl,
        });

        chrome.setHelpMenuLinks(helpMenuLinks);
      }
    );
  }
}
