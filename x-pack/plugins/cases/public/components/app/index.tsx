/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Owner } from '../../types';
import { OwnerProvider } from '../owner_context';
import { CasesRoutes } from './routes';
import { CasesRoutesProps } from './types';

export type CasesProps = CasesRoutesProps & Owner;

export const Cases: React.FC<CasesProps> = ({ owner, ...props }) => (
  <OwnerProvider owner={owner}>
    <CasesRoutes {...props} />
  </OwnerProvider>
);

// eslint-disable-next-line import/no-default-export
export { Cases as default };
