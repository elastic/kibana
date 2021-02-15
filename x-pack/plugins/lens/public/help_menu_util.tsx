/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeStart, DocLinksStart } from 'kibana/public';

export function addHelpMenuToAppChrome(chrome: ChromeStart, docLinks: DocLinksStart) {
  chrome.setHelpExtension({
    appName: 'Lens',
    links: [
      {
        linkType: 'documentation',
        href: `${docLinks.ELASTIC_WEBSITE_URL}guide/en/kibana/${docLinks.DOC_LINK_VERSION}/lens.html`,
      },
      {
        linkType: 'github',
        title: '[Lens]',
        labels: ['Feature:Lens'],
      },
    ],
  });
}
