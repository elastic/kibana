/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';

import type { AlertLifecycleStatusBadgeProps } from '../application/components/alert_lifecycle_status_badge';

const AlertLifecycleStatusBadgeLazy: React.FC<AlertLifecycleStatusBadgeProps> = lazy(
  () => import('../application/components/alert_lifecycle_status_badge')
);

export const getAlertLifecycleStatusBadgeLazy = (props: AlertLifecycleStatusBadgeProps) => (
  <Suspense fallback={<span />}>
    <AlertLifecycleStatusBadgeLazy {...props} />
  </Suspense>
);
