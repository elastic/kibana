/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { FormProvider } from 'react-hook-form';
import type { LiveQueryQueryFieldProps } from '../live_queries/form/live_query_query_field';
import type { ServicesWrapperProps } from './services_wrapper';
import ServicesWrapper from './services_wrapper';

const LiveQueryField = lazy(() => import('../live_queries/form/live_query_query_field'));

export const getLazyLiveQueryField =
  (services: ServicesWrapperProps['services']) =>
  // eslint-disable-next-line react/display-name
  ({
    formMethods,
    ...props
  }: LiveQueryQueryFieldProps & {
    formMethods: UseFormReturn<{
      label: string;
      query: string;
      ecs_mapping: Record<string, unknown>;
    }>;
  }) =>
    (
      <Suspense fallback={null}>
        <ServicesWrapper services={services}>
          <FormProvider {...formMethods}>
            <LiveQueryField {...props} />
          </FormProvider>
        </ServicesWrapper>
      </Suspense>
    );
