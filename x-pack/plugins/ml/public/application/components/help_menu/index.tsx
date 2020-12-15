/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../../contexts/kibana';

export const HelpMenu = React.memo(() => {
  const { chrome, docLinks } = useKibana().services;

  useEffect(() => {
    chrome.setHelpExtension({
      appName: i18n.translate('xpack.ml.chrome.help.appName', {
        defaultMessage: 'Machine Learning',
      }),
      links: [
        {
          content: i18n.translate('xpack.ml.chrome.helpMenu.documentation', {
            defaultMessage: 'Documentation',
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
