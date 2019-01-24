/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { PageConfig } from '../page_config';
import { WorkpadConfig } from '../workpad_config';
import { SidebarSection } from './sidebar_section';

export const GlobalConfig = () => (
  <div className="canvasSidebar">
    <SidebarSection>
      <WorkpadConfig />
    </SidebarSection>
    <SidebarSection>
      <PageConfig />
    </SidebarSection>
  </div>
);
