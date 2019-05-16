/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
// @ts-ignore unconverted component
import { SidebarContent } from './sidebar_content';

export const Sidebar: FunctionComponent = () => (
  <div className="canvasSidebar">
    <SidebarContent />
  </div>
);
