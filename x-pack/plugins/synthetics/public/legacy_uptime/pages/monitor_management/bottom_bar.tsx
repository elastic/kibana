/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { OutPortal } from 'react-reverse-portal';
import { ActionBarPortalNode } from './portals';

export const MonitorManagementBottomBar = () => {
  return (
    <div>
      <OutPortal node={ActionBarPortalNode} />
    </div>
  );
};
