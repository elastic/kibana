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

import {
  InstallationState,
  RiskScoreModuleName,
  installHostRiskScoreModule,
  installUserRiskScoreModule,
} from './utils';

const RiskyScoreEnableButtonComponent = ({
  refetch,
  moduleName,
  disabled = false,
}: {
  refetch: inputsModel.Refetch;
  moduleName: RiskScoreModuleName;
  disabled?: boolean;
}) => {
  const [installationState, setInstallationState] = useState<InstallationState>();
  const spaceId = useSpaceId();
  const { http, notifications } = useKibana().services;

  const onBoardingRiskScore = useCallback(async () => {
    setInstallationState(InstallationState.Started);

    if (moduleName === RiskScoreModuleName.Host) {
      await installHostRiskScoreModule({ http, notifications, spaceId });
    }

    if (moduleName === RiskScoreModuleName.User) {
      await installUserRiskScoreModule({ http, notifications, spaceId });
    }

    setInstallationState(InstallationState.Done);
    refetch();
  }, [moduleName, refetch, http, notifications, spaceId]);

  return (
    <EuiButton
      color="primary"
      fill
      onClick={onBoardingRiskScore}
      isLoading={installationState === InstallationState.Started}
      data-test-subj="risk-score-enable"
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
