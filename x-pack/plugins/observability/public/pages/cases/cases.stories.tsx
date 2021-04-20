/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType } from 'react';
import { CasesPage } from '.';
import { RouteParams } from '../../routes';

export default {
  title: 'app/Cases',
  component: CasesPage,
  decorators: [
    (Story: ComponentType) => {
      return <Story />;
    },
  ],
};

export function EmptyState() {
  return <CasesPage routeParams={{} as RouteParams<'/cases'>} />;
}
