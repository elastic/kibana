/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

import { useCreateIndex as useCreateIndexApi } from '../../../hooks/api/use_create_index';

import { useKibana } from '../../../hooks/use_kibana';

import { navigateToIndexDetails } from './utils';

export const useCreateIndex = () => {
  const { application, http } = useKibana().services;
  const { createIndex, isSuccess, isLoading, data: createIndexResponse } = useCreateIndexApi();
  useEffect(() => {
    if (isSuccess && createIndexResponse !== undefined) {
      navigateToIndexDetails(application, http, createIndexResponse.index);
      return;
    }
  }, [application, http, isSuccess, createIndexResponse]);

  return { createIndex, isLoading };
};
