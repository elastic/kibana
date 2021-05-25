/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { AlertEditProps } from '../application/sections/alert_form/alert_edit';

export const getEditAlertFlyoutLazy = (props: AlertEditProps) => {
  const AlertEditFlyoutLazy = lazy(() => import('../application/sections/alert_form/alert_edit'));
  return (
    <Suspense fallback={null}>
      <AlertEditFlyoutLazy {...props} />
    </Suspense>
  );
};
