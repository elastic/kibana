/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { OutPortal } from 'react-reverse-portal';
import { GLOBAL_HEADER_HEIGHT } from '../../../../../common/constants';
import { useGlobalHeaderPortal } from '../../../../common/hooks/use_global_header_portal';

export const GlobalKQLHeader = React.memo(() => {
  const { globalKQLHeaderPortalNode } = useGlobalHeaderPortal();
  /**
   * ReversePortal creates a div to mount the node within.
   * The styles below have to be applied to that wrapper div
   *
   */
  globalKQLHeaderPortalNode.style.position = 'sticky';
  globalKQLHeaderPortalNode.style.zIndex = '2000'; // theme.eui.euiZLevel2
  globalKQLHeaderPortalNode.style.top = `${GLOBAL_HEADER_HEIGHT}px`;

  return <OutPortal node={globalKQLHeaderPortalNode} />;
});

GlobalKQLHeader.displayName = 'GlobalKQLHeader';
