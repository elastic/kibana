/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../utils/query_client';
import { FormProvider } from './form_provider';

export const PlaygroundProvider: FC = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <FormProvider>{children}</FormProvider>
    </QueryClientProvider>
  );
};
