/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';
import { HeaderPage } from '../../../../common/components/header_page';

import * as i18n from './translations';

const CoverageOverviewPageComponent = () => {
  return (
    <>
      <SecuritySolutionPageWrapper data-test-subj="coverageOverviewPage">
        <HeaderPage title={i18n.COVERAGE_OVERVIEW_DASHBOARD_TITLE} />
      </SecuritySolutionPageWrapper>

      <SpyRoute pageName={SecurityPageName.coverageOverview} />
    </>
  );
};

export const CoverageOverviewPage = React.memo(CoverageOverviewPageComponent);
