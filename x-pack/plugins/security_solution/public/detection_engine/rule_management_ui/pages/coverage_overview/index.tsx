/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { DocLinks } from '@kbn/doc-links';
import { SecuritySolutionPageWrapper } from '../../../../common/components/page_wrapper';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../../../app/types';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { useAlertsPrivileges } from '../../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { HeaderPage } from '../../../../common/components/header_page';
import { useGetUserCasesPermissions } from '../../../../common/lib/kibana';

import { LandingPageComponent } from '../../../../common/components/landing_page';
import * as i18n from './translations';
import { NoPrivileges } from '../../../../common/components/no_privileges';

const CoverageOverviewComponent = () => {
  const { indicesExist } = useSourcererDataView();
  const { hasKibanaREAD, hasIndexRead } = useAlertsPrivileges();
  const canReadCases = useGetUserCasesPermissions().read;
  const canReadAlerts = hasKibanaREAD && hasIndexRead;

  if (!canReadAlerts && !canReadCases) {
    return <NoPrivileges docLinkSelector={(docLinks: DocLinks) => docLinks.siem.privileges} />;
  }

  return (
    <>
      {indicesExist ? (
        <>
          <SecuritySolutionPageWrapper data-test-subj="coverageOverviewPage">
            <HeaderPage title={i18n.COVERAGE_OVERVIEW_DASHBOARD_TITLE} />
            <></>
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <LandingPageComponent />
      )}

      <SpyRoute pageName={SecurityPageName.coverageOverview} />
    </>
  );
};

export const CoverageOverview = React.memo(CoverageOverviewComponent);
