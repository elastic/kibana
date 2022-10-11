/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListDetailsProvider } from './context';
import { ExceptionListDetailsComponent } from './exception_list_details';

export const ExceptionListDetails = memo(({ list }: { list: ExceptionListSchema }) => (
  <ExceptionListDetailsProvider>
    <ExceptionListDetailsComponent list={list} />
  </ExceptionListDetailsProvider>
));

ExceptionListDetails.displayName = 'ExceptionListDetails';
