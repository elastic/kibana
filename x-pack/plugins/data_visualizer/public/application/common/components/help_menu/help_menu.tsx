/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useDataVisualizerKibana } from '../../../kibana_context';

interface HelpMenuProps {
  docLink: string;
}

// Component for adding a documentation link to the help menu
export const HelpMenu: FC<HelpMenuProps> = React.memo(({ docLink }) => {
  const { chrome } = useDataVisualizerKibana().services;

  useEffect(() => {
    chrome.setHelpExtension({
      appName: i18n.translate('xpack.fileDataVisualizer.chrome.help.appName', {
        defaultMessage: 'Data Visualizer',
      }),
      links: [
        {
          href: docLink,
          linkType: 'documentation',
        },
      ],
    });
  }, [chrome, docLink]);

  return null;
});

HelpMenu.displayName = 'HelpMenu';
