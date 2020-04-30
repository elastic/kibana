/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { i18n } from '@kbn/i18n';
import { CoreStart } from 'kibana/public';

export function setHelpExtension({ chrome, http }: CoreStart) {
  chrome.setHelpExtension({
    appName: i18n.translate('xpack.apm.feedbackMenu.appName', {
      defaultMessage: 'APM'
    }),
    links: [
      {
        linkType: 'discuss',
        href: 'https://discuss.elastic.co/c/apm'
      },
      {
        linkType: 'custom',
        href: url.format({
          pathname: http.basePath.prepend('/app/kibana'),
          hash: '/management/elasticsearch/upgrade_assistant'
        }),
        content: i18n.translate('xpack.apm.helpMenu.upgradeAssistantLink', {
          defaultMessage: 'Upgrade assistant'
        })
      }
    ]
  });
}
