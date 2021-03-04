/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { FETCH_STATUS } from '../../../hooks/use_fetcher';
import { ErrorStatePrompt } from '../ErrorStatePrompt';

export function TableFetchWrapper({
  status,
  children,
}: {
  status: FETCH_STATUS;
  children: ReactNode;
}) {
  if (status === FETCH_STATUS.FAILURE) {
    return <ErrorStatePrompt />;
  }

  return <>{children}</>;
}
