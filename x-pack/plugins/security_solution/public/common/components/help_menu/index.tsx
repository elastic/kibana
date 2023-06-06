/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../lib/kibana';
import { SOLUTION_NAME } from '../../translations';

export const HelpMenu = React.memo(() => {
  const { chrome, docLinks } = useKibana().services;

  useEffect(() => {
    chrome.setHelpExtension({
      appName: SOLUTION_NAME,
      links: [
        {
          href: docLinks.links.siem.guide,
          iconType: 'logoSecurity',
          linkType: 'documentation',
          target: '_blank',
          rel: 'noopener',
        },
        {
          title: i18n.translate('xpack.securitySolution.chrome.helpMenu.documentation.ecs', {
            defaultMessage: 'ECS',
          }),
          href: docLinks.links.ecs.guide,
          iconType: 'documents',
          linkType: 'documentation',
          target: '_blank',
          rel: 'noopener',
        },
        {
          linkType: 'discuss',
          title: 'Discuss',
          iconType: 'discuss',
          href: 'https://discuss.elastic.co/c/security',
          target: '_blank',
          rel: 'noopener',
        },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
});

HelpMenu.displayName = 'HelpMenu';
