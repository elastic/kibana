/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { RiskScoreEntity } from '../../../common/search_strategy';

const RiskScoreHeaderTitleComponent = ({
  riskScoreEntity,
  title,
}: {
  riskScoreEntity: RiskScoreEntity;
  title?: string;
}) => (
  <>
    {title ??
      (riskScoreEntity === RiskScoreEntity.user ? (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.usersRiskDashboard.title"
          defaultMessage="User Risk Scores"
        />
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.hostsRiskDashboard.title"
          defaultMessage="Host Risk Scores"
        />
      ))}
  </>
);

export const RiskScoreHeaderTitle = React.memo(RiskScoreHeaderTitleComponent);
RiskScoreHeaderTitle.displayName = 'RiskScoreHeaderTitle';
