/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { FormProvider } from 'react-hook-form';
import ServicesWrapper from './services_wrapper';

// @ts-expect-error update types
export const getLazyLiveQueryField =
  (services) =>
  // eslint-disable-next-line react/display-name
  ({ formMethods, ...props }) => {
    const LiveQueryField = lazy(() => import('../live_queries/form/live_query_query_field'));

    console.error('formMethods', formMethods);

    return (
      <Suspense fallback={null}>
        <ServicesWrapper services={services}>
          <FormProvider {...formMethods}>
            <LiveQueryField {...props} />
          </FormProvider>
        </ServicesWrapper>
      </Suspense>
    );
  };
