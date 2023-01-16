/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { RiskScoreEntity } from '../../../../../common/search_strategy';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useKibana } from '../../../../common/lib/kibana';
import type { inputsModel } from '../../../../common/store';
import { REQUEST_NAMES, useFetch } from '../../../../common/hooks/use_fetch';
import { useRiskScoreToastContent } from './use_risk_score_toast_content';
import { restartRiskScoreTransforms } from './utils';

const RiskScoreRestartButtonComponent = ({
  refetch,
  riskScoreEntity,
}: {
  refetch: inputsModel.Refetch;
  riskScoreEntity: RiskScoreEntity;
}) => {
  const { fetch, isLoading } = useFetch(
    REQUEST_NAMES.REFRESH_RISK_SCORE,
    restartRiskScoreTransforms
  );
  const spaceId = useSpaceId();

  const { renderDocLink } = useRiskScoreToastContent(riskScoreEntity);
  const { http, notifications } = useKibana().services;

  const onClick = useCallback(async () => {
    fetch({
      http,
      notifications,
      refetch,
      renderDocLink,
      riskScoreEntity,
      spaceId,
    });
  }, [fetch, http, notifications, refetch, renderDocLink, riskScoreEntity, spaceId]);

  return (
    <EuiButton
      color="primary"
      fill
      onClick={onClick}
      isLoading={isLoading}
      data-test-subj={`restart_${riskScoreEntity}_risk_score`}
    >
      <FormattedMessage
        id="xpack.securitySolution.riskScore.restartButtonTitle"
        defaultMessage="Restart"
      />
    </EuiButton>
  );
};

export const RiskScoreRestartButton = React.memo(RiskScoreRestartButtonComponent);
RiskScoreRestartButton.displayName = 'RiskScoreRestartButton';
