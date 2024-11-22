/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { RiskScoreEntity } from '../../../../common/search_strategy';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useKibana } from '../../../common/lib/kibana';
import type { inputsModel } from '../../../common/store';
import { REQUEST_NAMES, useFetch } from '../../../common/hooks/use_fetch';
import { useRiskScoreToastContent } from './use_risk_score_toast_content';
import { installRiskScoreModule } from './utils';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { SecuritySolutionLinkButton } from '../../../common/components/links';
import { SecurityPageName } from '../../../../common/constants';

const RiskScoreEnableButtonComponent = ({
  refetch,
  riskScoreEntity,
  disabled = false,
  timerange,
}: {
  refetch: inputsModel.Refetch;
  riskScoreEntity: RiskScoreEntity;
  disabled?: boolean;
  timerange: {
    from: string;
    to: string;
  };
}) => {
  const spaceId = useSpaceId();
  const { http, dashboard, ...startServices } = useKibana().services;
  const { renderDocLink, renderDashboardLink } = useRiskScoreToastContent();
  const { fetch, isLoading } = useFetch(REQUEST_NAMES.ENABLE_RISK_SCORE, installRiskScoreModule);
  const isRiskEngineEnabled = useIsExperimentalFeatureEnabled('riskScoringRoutesEnabled');

  const onBoardingRiskScore = useCallback(() => {
    fetch({
      dashboard,
      http,
      refetch,
      renderDashboardLink,
      renderDocLink,
      riskScoreEntity,
      spaceId,
      timerange,
      startServices,
    });
  }, [
    dashboard,
    fetch,
    http,
    refetch,
    renderDashboardLink,
    renderDocLink,
    riskScoreEntity,
    spaceId,
    timerange,
    startServices,
  ]);

  return (
    <>
      {isRiskEngineEnabled ? (
        <SecuritySolutionLinkButton
          color="primary"
          fill
          deepLinkId={SecurityPageName.entityAnalyticsManagement}
          data-test-subj={`enable_${riskScoreEntity}_risk_score`}
        >
          <FormattedMessage
            id="xpack.securitySolution.riskScore.enableButtonTitle"
            defaultMessage="Enable"
          />
        </SecuritySolutionLinkButton>
      ) : (
        <EuiButton
          color="primary"
          fill
          onClick={onBoardingRiskScore}
          isLoading={isLoading}
          data-test-subj={`enable_${riskScoreEntity}_risk_score`}
          disabled={disabled}
        >
          <FormattedMessage
            id="xpack.securitySolution.riskScore.enableButtonTitle"
            defaultMessage="Enable"
          />
        </EuiButton>
      )}
    </>
  );
};

export const RiskScoreEnableButton = React.memo(RiskScoreEnableButtonComponent);
RiskScoreEnableButton.displayName = 'RiskScoreEnableButton';
