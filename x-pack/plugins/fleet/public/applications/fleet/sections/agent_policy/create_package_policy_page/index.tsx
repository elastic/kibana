/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

import { CreatePackagePolicySinglePage } from './single_page_layout';
import { CreatePackagePolicyMultiPage } from './multi_page_layout';

export const CreatePackagePolicyPage: React.FC<{}> = () => {
  const { search } = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(search), [search]);
  const useMultiPageLayout = useMemo(() => queryParams.has('useMultiPageLayout'), [queryParams]);
  if (useMultiPageLayout) {
    return <CreatePackagePolicyMultiPage />;
  }

  return <CreatePackagePolicySinglePage />;
};
