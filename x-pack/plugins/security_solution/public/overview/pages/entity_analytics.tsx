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
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';
import { useSourcererDataView } from '../../common/containers/sourcerer';
import { SecuritySolutionPageWrapper } from '../../common/components/page_wrapper';
import { HeaderPage } from '../../common/components/header_page';
import { LandingPageComponent } from '../../common/components/landing_page';

import { EntityAnalyticsHeader } from '../components/entity_analytics/header';
import { EntityAnalyticsAnomalies } from '../components/entity_analytics/anomalies';
import { SiemSearchBar } from '../../common/components/search_bar';
import { InputsModelId } from '../../common/store/inputs/constants';
import { FiltersGlobal } from '../../common/components/filters_global';
import { useRiskEngineStatus } from '../../entity_analytics/api/hooks/use_risk_engine_status';
import { RiskScoreUpdatePanel } from '../../entity_analytics/components/risk_score_update_panel';
import { useHasSecurityCapability } from '../../helper_hooks';

const EntityAnalyticsComponent = () => {
  const { data: riskScoreEngineStatus } = useRiskEngineStatus();
  const { indicesExist, loading: isSourcererLoading, indexPattern } = useSourcererDataView();
  const isRiskScoreModuleLicenseAvailable = useHasSecurityCapability('entity-analytics');

  return (
    <>
      {indicesExist ? (
        <>
          <FiltersGlobal>
            <SiemSearchBar id={InputsModelId.global} indexPattern={indexPattern} />
          </FiltersGlobal>

          <SecuritySolutionPageWrapper data-test-subj="entityAnalyticsPage">
            <HeaderPage title={ENTITY_ANALYTICS} />

            {isSourcererLoading ? (
              <EuiLoadingSpinner size="l" data-test-subj="entityAnalyticsLoader" />
            ) : (
              <EuiFlexGroup direction="column" data-test-subj="entityAnalyticsSections">
                {riskScoreEngineStatus?.isUpdateAvailable && isRiskScoreModuleLicenseAvailable && (
                  <EuiFlexItem>
                    <RiskScoreUpdatePanel />
                  </EuiFlexItem>
                )}

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
