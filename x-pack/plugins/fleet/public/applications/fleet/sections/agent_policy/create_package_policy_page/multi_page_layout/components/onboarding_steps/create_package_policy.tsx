/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CreatePackagePolicySinglePage } from '../../../single_page_layout';
import type { MultiPageStepLayoutProps } from '../../types';

export const CreatePackagePolicyFromOnboardingHub: React.FC<MultiPageStepLayoutProps> = ({
  onNext,
  onCancel,
  prerelease,
  withHeader,
}) => {
  return (
    <CreatePackagePolicySinglePage
      from="onboarding-hub"
      prerelease={prerelease}
      onNext={onNext}
      onCancel={onCancel}
      withHeader={withHeader}
    />
  );
};
