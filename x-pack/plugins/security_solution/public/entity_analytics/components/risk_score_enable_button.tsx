/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RiskScoreEntity } from '../../../common/search_strategy';
import type { inputsModel } from '../../common/store';
import { SecuritySolutionLinkButton } from '../../common/components/links';
import { SecurityPageName } from '../../../common/constants';

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
  return (
    <>
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
    </>
  );
};

export const RiskScoreEnableButton = React.memo(RiskScoreEnableButtonComponent);
RiskScoreEnableButton.displayName = 'RiskScoreEnableButton';
