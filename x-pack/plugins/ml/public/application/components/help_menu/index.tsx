/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

export const HelpMenu = React.memo(() => {
  const { chrome, docLinks } = useKibana().services;

  useEffect(() => {
    chrome.setHelpExtension({
      appName: i18n.translate('xpack.ml.chrome.help.appName', {
        defaultMessage: 'Machine learning',
      }),
      links: [
        {
          content: i18n.translate('xpack.ml.chrome.helpMenu.documentation', {
            defaultMessage: 'Machine learning documentation',
          }),
          href: docLinks.links.ml.guide,
          iconType: 'documents',
          linkType: 'custom',
          target: '_blank',
          rel: 'noopener',
        },
      ],
    });
  }, []);

  return null;
});

HelpMenu.displayName = 'HelpMenu';
