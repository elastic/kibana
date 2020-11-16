/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
import { ErrorStatePrompt } from '../ErrorStatePrompt';
import { LoadingStatePrompt } from '../LoadingStatePrompt';

export function TableFetchWrapper({
  hasData,
  status,
  children,
}: {
  hasData: boolean;
  status: FETCH_STATUS;
  children: React.ReactNode;
}) {
  if (status === FETCH_STATUS.FAILURE) {
    return <ErrorStatePrompt />;
  }

  if (!hasData && status !== FETCH_STATUS.SUCCESS) {
    return <LoadingStatePrompt />;
  }

  return <>{children}</>;
}
