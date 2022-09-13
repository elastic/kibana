/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import ServicesWrapper from './services_wrapper';
import type { ServicesWrapperProps } from './services_wrapper';
import type { OsqueryActionProps } from './osquery_action';

export const getLazyOsqueryAction =
  // eslint-disable-next-line react/display-name
  (services: ServicesWrapperProps['services']) => (props: OsqueryActionProps) => {
    const OsqueryAction = lazy(() => import('./osquery_action'));

    return (
      <Suspense fallback={null}>
        <ServicesWrapper services={services}>
          <OsqueryAction {...props} />
        </ServicesWrapper>
      </Suspense>
    );
  };
