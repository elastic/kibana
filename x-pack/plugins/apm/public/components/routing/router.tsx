/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCurrentRoute } from '@kbn/typed-react-router-config';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';
import React from 'react';
import { ApmMainTemplate } from './templates/apm_main_template';

export function Router({ children }: { children: React.ReactChild }) {
  const currentRoute = useCurrentRoute();

  if (currentRoute.hasExactMatch) {
    return <>{children}</>;
  }

  return (
    <ApmMainTemplate pageTitle="APM">
      <NotFoundPrompt />
    </ApmMainTemplate>
  );
}
