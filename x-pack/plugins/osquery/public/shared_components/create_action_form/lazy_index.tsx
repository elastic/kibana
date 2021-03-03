/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';

// @ts-expect-error update types
export const getLazyCreateOsqueryActionForm = (props) => {
  const CreateOsqueryActionForm = lazy(() => import('./index'));
  return (
    <Suspense fallback={null}>
      <CreateOsqueryActionForm {...props} />
    </Suspense>
  );
};
