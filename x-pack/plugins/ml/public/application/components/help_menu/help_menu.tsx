/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../../contexts/kibana';

interface HelpMenuProps {
  docLink: string;
}

// Component for adding a documentation link to the help menu
export const HelpMenu: FC<HelpMenuProps> = React.memo(({ docLink }) => {
  const { chrome } = useMlKibana().services;

  useEffect(() => {
    chrome.setHelpExtension({
      appName: i18n.translate('xpack.ml.chrome.help.appName', {
        defaultMessage: 'Machine Learning',
      }),
      links: [
        {
          href: docLink,
          linkType: 'documentation',
        },
      ],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
});

HelpMenu.displayName = 'HelpMenu';
