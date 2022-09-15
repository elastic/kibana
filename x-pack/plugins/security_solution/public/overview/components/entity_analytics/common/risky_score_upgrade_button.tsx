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
import { upgradeHostRiskScoreModule, upgradeUserRiskScoreModule } from './utils';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { useRiskyScoreToastContent } from './use_risky_score_toast_content';
import { REQUEST_NAMES, useFetch } from '../../../../common/hooks/use_fetch';

const RiskyScoreUpgradeButtonComponent = ({
  refetch,
  riskScoreEntity,
  timerange,
}: {
  refetch: inputsModel.Refetch;
  riskScoreEntity: RiskScoreEntity;
  timerange: {
    from: string;
    to: string;
  };
}) => {
  const spaceId = useSpaceId();
  const { http, notifications, theme, dashboard } = useKibana().services;
  const { renderDocLink, renderDashboardLink } = useRiskyScoreToastContent(riskScoreEntity);
  const { fetch, isLoading } = useFetch(
    REQUEST_NAMES.UPGRADE_RISK_SCORE,
    riskScoreEntity === RiskScoreEntity.user
      ? upgradeUserRiskScoreModule
      : upgradeHostRiskScoreModule
  );

  const upgradeHostRiskScore = useCallback(async () => {
    fetch({
      http,
      notifications,
      spaceId,
      timerange,
      refetch,
      renderDashboardLink,
      renderDocLink,
      theme,
      dashboard,
    });
  }, [
    fetch,
    http,
    notifications,
    spaceId,
    timerange,
    renderDashboardLink,
    renderDocLink,
    theme,
    dashboard,
    refetch,
  ]);

  return (
    <EuiButton
      color="primary"
      fill
      onClick={upgradeHostRiskScore}
      isLoading={isLoading}
      data-test-subj="risk-score-upgrade"
    >
      {isLoading ? (
        <FormattedMessage
          id="xpack.securitySolution.riskyScore.upgradingButtonTitle"
          defaultMessage="Upgrading"
        />
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.riskyScore.upgradeButtonTitle"
          defaultMessage="Upgrade"
        />
      )}
    </EuiButton>
  );
};

export const RiskyScoreUpgradeButton = React.memo(RiskyScoreUpgradeButtonComponent);
RiskyScoreUpgradeButton.displayName = 'RiskyScoreUpgradeButton';
