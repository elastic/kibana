/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { ExceptionListDetailsProvider } from './context';
import { ExceptionListDetailsComponent } from './exception_list_details';
import type { ExceptionListWithRules } from './types';

export const ExceptionListDetails = memo(
  ({ list, isReadOnly = false }: { list: ExceptionListWithRules; isReadOnly: boolean }) => (
    <ExceptionListDetailsProvider>
      <ExceptionListDetailsComponent list={list} isReadOnly={isReadOnly} />
    </ExceptionListDetailsProvider>
  )
);

ExceptionListDetails.displayName = 'ExceptionListDetails';
