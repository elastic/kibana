/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { OutPortal } from 'react-reverse-portal';
import { useGlobalHeaderPortal } from '../../../../common/hooks/use_global_header_portal';

export const GlobalKQLHeader = React.memo(() => {
  const { globalKQLHeaderPortalNode } = useGlobalHeaderPortal();
  return <OutPortal node={globalKQLHeaderPortalNode} />;
});

GlobalKQLHeader.displayName = 'GlobalKQLHeader';
