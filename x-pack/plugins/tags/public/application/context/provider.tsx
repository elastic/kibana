/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Router } from 'react-router-dom';
import { context } from './tags_app_context';
import { TagsAppServices } from '../services';
import { TagsProvider } from '../../context';

export interface Props {
  services: TagsAppServices;
}

export const TagsAppProvider: React.FC<Props> = ({ services, children }) => {
  return (
    <context.Provider value={services}>
      <TagsProvider value={services.tags}>
        <Router history={services.history}>{children}</Router>
      </TagsProvider>
    </context.Provider>
  );
};
