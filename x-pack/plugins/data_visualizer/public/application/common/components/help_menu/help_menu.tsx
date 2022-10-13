/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect } from 'react';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { INDEX_DATA_VISUALIZER_NAME } from '../../constants';

interface HelpMenuProps {
  docLink: string;
}

// Component for adding a documentation link to the help menu
export const HelpMenu: FC<HelpMenuProps> = React.memo(({ docLink }) => {
  const { chrome } = useDataVisualizerKibana().services;

  useEffect(() => {
    chrome.setHelpExtension({
      appName: INDEX_DATA_VISUALIZER_NAME,
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
