/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { restartRiskScoreTransforms } from './utils';
import type { inputsModel } from '../../../../common/store';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useKibana } from '../../../../common/lib/kibana';
import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import { REQUEST_NAMES, useFetch } from '../../../../common/hooks/use_fetch';

const RiskyScoreRestartButtonComponent = ({
  refetch,
  riskScoreEntity,
  disabled = false,
}: {
  refetch: inputsModel.Refetch;
  riskScoreEntity: RiskScoreEntity;
  disabled?: boolean;
}) => {
  const { http, notifications } = useKibana().services;
  const spaceId = useSpaceId();
  const { fetch, isLoading } = useFetch(
    REQUEST_NAMES.RESTART_RISK_SCORE,
    restartRiskScoreTransforms
  );

  const onBoardingHostRiskScore = useCallback(async () => {
    fetch({
      http,
      notifications,
      spaceId,
      refetch,
      riskScoreEntity,
    });
  }, [fetch, http, notifications, spaceId, refetch, riskScoreEntity]);

  return (
    <EuiButtonEmpty
      onClick={onBoardingHostRiskScore}
      isLoading={isLoading}
      data-test-subj="risk-score-restart"
      disabled={disabled}
    >
      {isLoading ? (
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
