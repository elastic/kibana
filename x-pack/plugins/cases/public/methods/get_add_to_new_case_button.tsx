/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';
import { Provider } from 'react-redux';
import { AddToCaseActionProps } from '../components/add_to_case';
import { AppStore } from '../store';

const AddToNewCaseButtonLazy = lazy(() => import('../components/add_to_case/button'));
export const getAddToNewCaseButtonLazy = (
  props: AddToCaseActionProps,
  { store }: { store: AppStore }
) => (
  <Suspense fallback={<EuiLoadingSpinner />}>
    <Provider store={store}>
      <AddToNewCaseButtonLazy {...props} type={'new'} />
    </Provider>
  </Suspense>
);
