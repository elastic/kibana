/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';

export const LazyResponseActionsForm = (props: unknown) => {
  const ResponseActionsForm = lazy(() => import('./response_actions_form'));

  return (
    <Suspense fallback={null}>
      <ResponseActionsForm {...props} />
    </Suspense>
  );
};
