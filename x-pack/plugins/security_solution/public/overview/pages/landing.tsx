/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { memo } from 'react';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../common/constants';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';

export const LandingPage = memo(() => {
  return (
    <>
      <SecuritySolutionPageWrapper>
        <EuiFlexGroup>
          <EuiFlexItem>{'landing page'}</EuiFlexItem>
        </EuiFlexGroup>
      </SecuritySolutionPageWrapper>
      <SpyRoute pageName={SecurityPageName.landing} />
    </>
  );
});

LandingPage.displayName = 'LandingPage';
