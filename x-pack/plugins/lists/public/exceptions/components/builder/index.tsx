/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense, lazy } from 'react';

// Note: Only use import type/export type here to avoid pulling anything non-lazy into the main plugin and increasing the plugin size
import type { ExceptionBuilderProps } from './exception_items_renderer';
export type { OnChangeProps } from './exception_items_renderer';

interface ExtraProps {
  dataTestSubj: string;
  idAria: string;
}

/**
 * This lazy load allows the exception builder to pull everything out into a plugin chunk.
 * You want to be careful of not directly importing/exporting things from exception_items_renderer
 * unless you use a import type, and/or a export type to ensure full type erasure
 */
const ExceptionBuilderComponentLazy = lazy(() => import('./exception_items_renderer'));
export const getExceptionBuilderComponentLazy = (
  props: ExceptionBuilderProps & ExtraProps
): JSX.Element => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <ExceptionBuilderComponentLazy
      data-test-subj={props.dataTestSubj}
      id-aria={props.idAria}
      {...props}
    />
  </Suspense>
);
