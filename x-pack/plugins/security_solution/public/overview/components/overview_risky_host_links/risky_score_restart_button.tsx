/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useKibana } from '../../../common/lib/kibana';
import type { inputsModel } from '../../../common/store';
import type { RiskScoreModuleName } from './utils';
import { RestartState, restartRiskScoreTransforms } from './utils';

const RiskyScoreRestartButtonComponent = ({
  refetch,
  moduleName,
}: {
  refetch: inputsModel.Refetch;
  moduleName: RiskScoreModuleName;
}) => {
  const [restartState, setRestartState] = useState<RestartState>();
  const { http, notifications } = useKibana().services;
  const spaceId = useSpaceId();
  const onBoardingHostRiskScore = useCallback(async () => {
    setRestartState(RestartState.Started);
    await restartRiskScoreTransforms({ http, notifications, spaceId, moduleName });
    setRestartState(RestartState.Done);
    refetch();
  }, [http, moduleName, notifications, refetch, spaceId]);

  return (
    <EuiButton
      onClick={onBoardingHostRiskScore}
      isLoading={restartState === RestartState.Started}
      data-test-subj="risk-score-restart"
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
    </EuiButton>
  );
};

export const RiskyScoreRestartButton = React.memo(RiskyScoreRestartButtonComponent);
RiskyScoreRestartButton.displayName = 'RiskyScoreRestartButton';
