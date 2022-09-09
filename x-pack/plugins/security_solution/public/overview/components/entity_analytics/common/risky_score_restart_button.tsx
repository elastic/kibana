/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { RestartState, restartRiskScoreTransforms } from './utils';
import type { inputsModel } from '../../../../common/store';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useKibana } from '../../../../common/lib/kibana';
import type { RiskScoreEntity } from '../../../../../common/search_strategy';

const RiskyScoreRestartButtonComponent = ({
  refetch,
  riskScoreEntity,
  disabled = false,
}: {
  refetch: inputsModel.Refetch;
  riskScoreEntity: RiskScoreEntity;
  disabled?: boolean;
}) => {
  const [restartState, setRestartState] = useState<RestartState>();
  const { http, notifications } = useKibana().services;
  const spaceId = useSpaceId();

  const onBoardingHostRiskScore = useCallback(async () => {
    setRestartState(RestartState.Started);
    await restartRiskScoreTransforms({
      http,
      notifications,
      spaceId,
      riskScoreEntity,
    });
    setRestartState(RestartState.Done);
    refetch();
  }, [http, riskScoreEntity, notifications, refetch, spaceId]);

  return (
    <EuiButtonEmpty
      onClick={onBoardingHostRiskScore}
      isLoading={restartState === RestartState.Started}
      data-test-subj="risk-score-restart"
      disabled={disabled}
    >
      {restartState === RestartState.Started ? (
        <FormattedMessage
          id="xpack.securitySolution.riskyScore.restartingButtonTitle"
          defaultMessage="Restarting"
        />
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.riskyScore.restartButtonTitle"
          defaultMessage="Restart"
        />
      )}
    </EuiButtonEmpty>
  );
};

export const RiskyScoreRestartButton = React.memo(RiskyScoreRestartButtonComponent);
RiskyScoreRestartButton.displayName = 'RiskyScoreRestartButton';
