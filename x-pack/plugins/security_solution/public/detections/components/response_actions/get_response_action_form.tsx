/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { ArrayItem } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export interface ResponseActionFormProps {
  items: ArrayItem[];
  addItem: () => void;
  removeItem: (id: number) => void;
}

export const getLazyResponseActionForm = (props: ResponseActionFormProps) => {
  const ResponseActionForm = lazy(() => import('./response_action_form'));

  return (
    <Suspense fallback={null}>
      <ResponseActionForm {...props} />
    </Suspense>
  );
};
