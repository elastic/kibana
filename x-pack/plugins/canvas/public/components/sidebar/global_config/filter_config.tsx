/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { WorkpadFilters } from '../../workpad_filters';
// @ts-expect-error unconverted component
import { SidebarSection } from '../sidebar_section';

export const FilterConfig: FC = () => {
  return <WorkpadFilters />;
};
