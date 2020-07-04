/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { context } from './tags_app_context';
import { TagsAppServices } from '../services';
import { TagsProvider } from '../../context';

export interface Props {
  services: TagsAppServices;
}

export const TagsAppProvider: React.FC<Props> = ({ services, children }) => {
  return (
    <context.Provider value={services}>
      <TagsProvider value={services.tags}>{children}</TagsProvider>
    </context.Provider>
  );
};
