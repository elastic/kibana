/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import type { CoreStart } from '@kbn/core/public';
export function RedirectToHomeIfUnauthorized({
  coreStart,
  children,
}: {
  coreStart: CoreStart;
  children: ReactNode;
}) {
  const {
    application: { capabilities, navigateToApp },
  } = coreStart;

  const allowed =
    (capabilities?.management && capabilities?.observabilityAIAssistant?.show) ?? false;

  if (!allowed) {
    navigateToApp('home');
    return null;
  }

  return <>{children}</>;
}
