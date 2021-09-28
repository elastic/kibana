/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Router, Switch, Route } from 'react-router-dom';

import type { AppMountParameters, HttpStart } from 'src/core/public';
import type { SpacesPluginStart } from '../../spaces/public';
import { VIEW_NOTE_PATH } from '../common';
import { NotesList } from './notes_list';
import type { Services } from './services';
import { ViewNote } from './view_note';

interface RenderParams {
  services: Services;
  appMountParams: AppMountParameters;
  http: HttpStart;
  spacesApi?: SpacesPluginStart;
}

export const renderApp = ({ services, appMountParams, http, spacesApi }: RenderParams) => {
  const { element, history } = appMountParams;

  ReactDOM.render(
    <Router history={history}>
      <Switch>
        <Route path={`/${VIEW_NOTE_PATH}/:noteId`}>
          <ViewNote services={services} http={http} spacesApi={spacesApi} />
        </Route>
        <Route path="/" exact>
          <NotesList services={services} />
        </Route>
      </Switch>
    </Router>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
