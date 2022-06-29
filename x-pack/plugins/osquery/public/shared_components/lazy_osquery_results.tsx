/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { OsqueryActionResultsProps } from './osquery_results/types';
import { StartServices } from '../types';

interface BigServices extends StartServices {
  kibanaVersion: string;
  storage: unknown;
}

export const getLazyOsqueryResults =
  // eslint-disable-next-line react/display-name
  (services: BigServices) => (props: OsqueryActionResultsProps) => {
    const OsqueryResults = lazy(() => import('./osquery_results'));

    return (
      <Suspense fallback={null}>
        <OsqueryResults services={services} {...props} />
      </Suspense>
    );
  };
