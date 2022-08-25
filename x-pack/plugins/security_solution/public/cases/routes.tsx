/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';
import type { SecuritySubPluginRoutes } from '../app/types';
import { CASES_PATH } from '../../common/constants';
import { Cases } from './pages';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';

export const CasesRoutes = () => {
  return (
    <PluginTemplateWrapper>
      <TrackApplicationView viewId="case">
        <Cases />
      </TrackApplicationView>
    </PluginTemplateWrapper>
  );
};

export const routes: SecuritySubPluginRoutes = [
  {
    path: CASES_PATH,
    component: CasesRoutes,
  },
];
