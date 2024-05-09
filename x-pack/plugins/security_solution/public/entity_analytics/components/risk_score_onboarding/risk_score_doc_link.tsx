/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React, { useMemo } from 'react';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import { useKibana } from '../../../common/lib/kibana';
import { LEARN_MORE } from '../entity_analytics_risk_score/translations';

const useLearnMoreLinkForEntity = (riskScoreEntity?: RiskScoreEntity) => {
  const { docLinks } = useKibana().services;
  const entityAnalyticsLinks = docLinks.links.securitySolution.entityAnalytics;
  return useMemo(() => {
    if (!riskScoreEntity) {
      return entityAnalyticsLinks.entityRiskScoring;
    }
    if (riskScoreEntity === RiskScoreEntity.user) {
      return entityAnalyticsLinks.userRiskScore;
    }
    return entityAnalyticsLinks.hostRiskScore;
  }, [riskScoreEntity, entityAnalyticsLinks]);
};

const RiskScoreDocLinkComponent = ({
  riskScoreEntity,
  title,
}: {
  riskScoreEntity?: RiskScoreEntity;
  title?: string | React.ReactNode;
}) => {
  const learnMoreLink = useLearnMoreLinkForEntity(riskScoreEntity);

  return (
    <EuiLink target="_blank" rel="noopener nofollow noreferrer" href={learnMoreLink}>
      {title ? title : LEARN_MORE(riskScoreEntity)}
    </EuiLink>
  );
};

export const RiskScoreDocLink = React.memo(RiskScoreDocLinkComponent);

RiskScoreDocLink.displayName = 'RiskScoreDocLink';
