/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useKibana } from '../../../../common/lib/kibana';
import type { inputsModel } from '../../../../common/store';

import { InstallationState, installHostRiskScoreModule, installUserRiskScoreModule } from './utils';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { useRiskyScoreToastContent } from './use_risky_score_toast_content';

const RiskyScoreEnableButtonComponent = ({
  refetch,
  riskScoreEntity,
  disabled = false,
  timerange,
}: {
  refetch: inputsModel.Refetch;
  riskScoreEntity: RiskScoreEntity;
  disabled?: boolean;
  timerange: {
    startDate: string;
    endDate: string;
  };
}) => {
  const [installationState, setInstallationState] = useState<InstallationState>();
  const spaceId = useSpaceId();
  const { http, notifications, theme, dashboard } = useKibana().services;
  const { renderDocLink, renderDashboardLink } = useRiskyScoreToastContent(riskScoreEntity);

  const onBoardingRiskScore = useCallback(async () => {
    setInstallationState(InstallationState.Started);

    if (riskScoreEntity === RiskScoreEntity.host) {
      await installHostRiskScoreModule({
        http,
        theme,
        renderDocLink,
        renderDashboardLink,
        dashboard,
        notifications,
        spaceId,
        timerange,
      });
    }

    if (riskScoreEntity === RiskScoreEntity.user) {
      await installUserRiskScoreModule({
        http,
        theme,
        renderDocLink,
        renderDashboardLink,
        dashboard,
        notifications,
        spaceId,
        timerange,
      });
    }

    setInstallationState(InstallationState.Done);
    refetch();
  }, [
    riskScoreEntity,
    refetch,
    http,
    theme,
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
      isLoading={installationState === InstallationState.Started}
      data-test-subj={`enable_${riskScoreEntity}_risk_score`}
      disabled={disabled}
    >
      {installationState === InstallationState.Started ? (
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

export const RiskyScoreEnableButton = React.memo(RiskyScoreEnableButtonComponent);
RiskyScoreEnableButton.displayName = 'RiskyScoreEnableButton';
