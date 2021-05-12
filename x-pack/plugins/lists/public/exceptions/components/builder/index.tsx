/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { Suspense, lazy } from 'react';

import type { ExceptionBuilderProps } from './exception_items_renderer';
export type { OnChangeProps } from './exception_items_renderer';

interface ExtraProps {
  dataTestSubj: string;
  idAria: string;
}

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
