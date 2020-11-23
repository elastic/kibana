/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { FETCH_STATUS } from '../../../hooks/useFetcher';
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
