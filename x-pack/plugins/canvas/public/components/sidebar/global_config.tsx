/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FunctionComponent } from 'react';
// @ts-expect-error unconverted component
import { ElementConfig } from '../element_config';
// @ts-expect-error unconverted component
import { PageConfig } from '../page_config';
import { WorkpadConfig } from '../workpad_config';
// @ts-expect-error unconverted component
import { SidebarSection } from './sidebar_section';

export const GlobalConfig: FunctionComponent = () => (
  <Fragment>
    <SidebarSection>
      <WorkpadConfig />
    </SidebarSection>
    <SidebarSection>
      <ElementConfig />
    </SidebarSection>
    <SidebarSection>
      <PageConfig />
    </SidebarSection>
  </Fragment>
);
