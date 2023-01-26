/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import React, { lazy, Suspense } from 'react';

const RulesSettingsLinkLazy: React.FC = lazy(
  () => import('../application/components/rules_setting/rules_settings_link')
);

export const getRulesSettingsLinkLazy = () => {
  return (
    <Suspense fallback={<EuiLoadingSpinner />}>
      <RulesSettingsLinkLazy />
    </Suspense>
  );
};
