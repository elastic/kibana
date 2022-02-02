/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreStart, IBasePath } from 'kibana/public';

export function getUpgradeAssistantHref(basePath: IBasePath) {
  return basePath.prepend('/app/management/stack/upgrade_assistant');
}

export function setHelpExtension({ chrome, http }: CoreStart) {
  chrome.setHelpExtension({
    appName: i18n.translate('xpack.ux.feedbackMenu.appName', {
      defaultMessage: 'APM',
    }),
    links: [
      {
        linkType: 'discuss',
        href: 'https://discuss.elastic.co/c/apm',
      },
      {
        linkType: 'custom',
        href: getUpgradeAssistantHref(http.basePath),
        content: i18n.translate('xpack.ux.helpMenu.upgradeAssistantLink', {
          defaultMessage: 'Upgrade assistant',
        }),
      },
    ],
  });
}
