/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import type { DocLinks } from '@kbn/doc-links';
import { InputsModelId } from '../../common/store/inputs/constants';
import { SiemSearchBar } from '../../common/components/search_bar';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { HeaderPage } from '../../common/components/header_page';
import { useGetUserCasesPermissions } from '../../common/lib/kibana';

import { LandingPageComponent } from '../../common/components/landing_page';
import * as i18n from './translations';
import { NoPrivileges } from '../../common/components/no_privileges';
import { FiltersGlobal } from '../../common/components/filters_global';

const MitreAttackCoverageComponent = () => {
  const { indicesExist, indexPattern, loading: isSourcererLoading } = useSourcererDataView();
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
          <FiltersGlobal>
            <SiemSearchBar id={InputsModelId.global} indexPattern={indexPattern} />
          </FiltersGlobal>
          <SecuritySolutionPageWrapper data-test-subj="mitreAttackCoveragePage">
            <HeaderPage title={i18n.MITRE_ATTACK_COVERAGE_TITLE} />
            {isSourcererLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj="mitreAttackCoverageLoader" />
            ) : (
              <></>
            )}
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <LandingPageComponent />
      )}

      <SpyRoute pageName={SecurityPageName.mitreAttackCoverage} />
    </>
  );
};

export const MitreAttackCoverage = React.memo(MitreAttackCoverageComponent);
