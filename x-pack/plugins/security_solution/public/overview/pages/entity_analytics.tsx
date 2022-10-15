/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import { EntityAnalyticsRiskScores } from '../components/entity_analytics/risk_score';
import { RiskScoreEntity } from '../../../common/search_strategy';
import { ENTITY_ANALYTICS } from '../../app/translations';
import { Paywall } from '../../common/components/paywall';
import { useMlCapabilities } from '../../common/components/ml/hooks/use_ml_capabilities';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { LandingPageComponent } from '../../common/components/landing_page';
import * as i18n from './translations';

import { EntityAnalyticsHeader } from '../components/entity_analytics/header';
import { EntityAnalyticsAnomalies } from '../components/entity_analytics/anomalies';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';

const EntityAnalyticsComponent = () => {
  const { indicesExist, loading: isSourcererLoading, indexPattern } = useSourcererDataView();
  const { isPlatinumOrTrialLicense, capabilitiesFetched } = useMlCapabilities();

  return (
    <>
      {indicesExist ? (
        <>
          <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
            <HeaderPage title={ENTITY_ANALYTICS}>
              {isPlatinumOrTrialLicense && capabilitiesFetched && (
                <SiemSearchBar
                  id={InputsModelId.global}
                  indexPattern={indexPattern}
                  hideFilterBar
                  hideQueryInput
                />
              )}
            </HeaderPage>
            {!isPlatinumOrTrialLicense && capabilitiesFetched ? (
              <Paywall heading={i18n.ENTITY_ANALYTICS_LICENSE_DESC} />
            ) : isSourcererLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsLoader" />
            ) : (
              <EuiFlexGroup direction="column" data-test-subj="entityAnalyticsSections">
                <EuiFlexItem>
                  <EntityAnalyticsHeader />
                </EuiFlexItem>

                <EuiFlexItem>
                  <EntityAnalyticsRiskScores riskEntity={RiskScoreEntity.host} />
                </EuiFlexItem>

                <EuiFlexItem>
                  <EntityAnalyticsRiskScores riskEntity={RiskScoreEntity.user} />
                </EuiFlexItem>

                <EuiFlexItem>
                  <EntityAnalyticsAnomalies />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </SecuritySolutionPageWrapper>
        </>
      ) : (
        <LandingPageComponent />
      )}

      <SpyRoute pageName={SecurityPageName.entityAnalytics} />
    </>
  );
};

export const EntityAnalyticsPage = React.memo(EntityAnalyticsComponent);
