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
import { UpgradeState, upgradeHostRiskScoreModule, upgradeUserRiskScoreModule } from './utils';
import { RiskScoreEntity } from '../../../../../common/search_strategy';

const RiskyScoreUpgradeButtonComponent = ({
  refetch,
  riskScoreEntity,
}: {
  refetch: inputsModel.Refetch;
  riskScoreEntity: RiskScoreEntity;
}) => {
  const [status, setStatus] = useState<UpgradeState>();
  const spaceId = useSpaceId();
  const { http, notifications } = useKibana().services;

  const upgradeHostRiskScore = useCallback(async () => {
    setStatus(UpgradeState.Started);

    if (riskScoreEntity === RiskScoreEntity.host) {
      await upgradeHostRiskScoreModule({ http, notifications, spaceId });
    }

    if (riskScoreEntity === RiskScoreEntity.user) {
      await upgradeUserRiskScoreModule({ http, notifications, spaceId });
    }
    setStatus(UpgradeState.Done);
    refetch();
  }, [riskScoreEntity, refetch, http, notifications, spaceId]);

  return (
    <EuiButton
      onClick={upgradeHostRiskScore}
      isLoading={status === UpgradeState.Started}
      data-test-subj="risk-score-upgrade"
    >
      {status === UpgradeState.Started ? (
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
