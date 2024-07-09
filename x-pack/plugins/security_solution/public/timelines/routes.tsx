/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { TrackApplicationView } from '@kbn/usage-collection-plugin/public';

import { Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';
import { SpyRoute } from '../common/utils/route/spy_routes';
import { NotFoundPage } from '../app/404';
import { NoteManagementPage } from '../notes/pages/note_management_page';
import { PluginTemplateWrapper } from '../common/components/plugin_template_wrapper';
import { SecurityPageName } from '../app/types';
import type { SecuritySubPluginRoutes } from '../app/types';
import { NOTES_MANAGEMENT_PATH, TIMELINES_PATH } from '../../common/constants';
import { Timelines } from './pages';

const NoteManagementTelemetry = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.notesManagement}>
      <NoteManagementPage />
      <SpyRoute pageName={SecurityPageName.notesManagement} />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

const NoteManagementContainer = memo(() => {
  return (
    <Switch>
      <Route path={NOTES_MANAGEMENT_PATH} exact component={NoteManagementTelemetry} />
      <Route component={NotFoundPage} />
    </Switch>
  );
});
NoteManagementContainer.displayName = 'NoteManagementContainer';

const TimelinesRoutes = () => (
  <PluginTemplateWrapper>
    <TrackApplicationView viewId={SecurityPageName.timelines}>
      <Timelines />
    </TrackApplicationView>
  </PluginTemplateWrapper>
);

export const routes: SecuritySubPluginRoutes = [
  {
    path: TIMELINES_PATH,
    component: TimelinesRoutes,
  },
  {
    path: NOTES_MANAGEMENT_PATH,
    component: NoteManagementContainer,
  },
];
