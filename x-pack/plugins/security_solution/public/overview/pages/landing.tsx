/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { LandingPageComponent } from '../../common/components/landing_page';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';

export const LandingPage = memo(() => {
  return (
    <SecuritySolutionPageWrapper>
      <LandingPageComponent />
    </SecuritySolutionPageWrapper>
  );
});

LandingPage.displayName = 'LandingPage';
