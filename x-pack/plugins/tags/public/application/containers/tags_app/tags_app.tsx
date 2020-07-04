/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { LandinPage } from './pages/landing_page';
import { TagsAppServices } from '../../services';
import { TagsAppProvider } from '../../context';

export interface Props {
  services: TagsAppServices;
}

export const TagsApp: React.FC<Props> = ({ services }) => {
  return (
    <TagsAppProvider services={services}>
      <LandinPage />
    </TagsAppProvider>
  );
};
