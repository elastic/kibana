/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useKibana } from '../../../../common/lib/kibana';
import type { inputsModel } from '../../../../common/store';

import { installHostRiskScoreModule, installUserRiskScoreModule } from './utils';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { useRiskScoreToastContent } from './use_risk_score_toast_content';
import { REQUEST_NAMES, useFetch } from '../../../../common/hooks/use_fetch';

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
  const { http, notifications, theme, dashboard } = useKibana().services;
  const { renderDocLink, renderDashboardLink } = useRiskScoreToastContent(riskScoreEntity);
  const { fetch, isLoading } = useFetch(
    REQUEST_NAMES.ENABLE_RISK_SCORE,
    riskScoreEntity === RiskScoreEntity.user
      ? installUserRiskScoreModule
      : installHostRiskScoreModule
  );

  const onBoardingRiskScore = useCallback(() => {
    fetch({
      http,
      theme,
      refetch,
      renderDocLink,
      renderDashboardLink,
      dashboard,
      notifications,
      spaceId,
      timerange,
    });
  }, [
    fetch,
    http,
    theme,
    refetch,
    renderDocLink,
    renderDashboardLink,
    dashboard,
    notifications,
    spaceId,
    timerange,
  ]);

  return (
    <EuiButton
      color="primary"
      fill
      onClick={onBoardingRiskScore}
      isLoading={isLoading}
      data-test-subj={`enable_${riskScoreEntity}_risk_score`}
      disabled={disabled}
    >
      {isLoading ? (
        <FormattedMessage
          id="xpack.securitySolution.riskyScore.enablingButtonTitle"
          defaultMessage="Enabling"
        />
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.riskyScore.enableButtonTitle"
          defaultMessage="Enable"
        />
      )}
    </EuiButton>
  );
};

export const RiskScoreEnableButton = React.memo(RiskScoreEnableButtonComponent);
RiskScoreEnableButton.displayName = 'RiskScoreEnableButton';
