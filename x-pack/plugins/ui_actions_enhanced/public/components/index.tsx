/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import { ActionWizardProps } from './action_wizard/action_wizard';

const ActionWizardLazy = React.lazy(() => import('./action_wizard/action_wizard'));

export const ActionWizard = (props: ActionWizardProps) => {
  return (
    <Suspense fallback={<div />}>
      <ActionWizardLazy {...props} />
    </Suspense>
  );
};
