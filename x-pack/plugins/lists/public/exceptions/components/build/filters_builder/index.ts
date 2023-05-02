/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { withSuspense } from '@kbn/shared-ux-utility';

/**
 * The Lazily-loaded `FiltersBuilder` component.  Consumers should use `React.Suspense` or
 * the withSuspense` HOC to load this component.
 */
export const FiltersBuilderLazy = React.lazy(() => import('./filters_builder'));

/**
 * A `FiltersBuilder` component that is wrapped by the `withSuspense` HOC. This component can
 * be used directly by consumers and will load the `FiltersBuilderLazy` component lazily with
 * a predefined fallback and error boundary.
 */
export const FiltersBuilder = withSuspense(FiltersBuilderLazy);
