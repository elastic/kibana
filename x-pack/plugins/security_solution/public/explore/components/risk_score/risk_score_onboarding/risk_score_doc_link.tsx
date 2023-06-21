/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { RISKY_HOSTS_DOC_LINK, RISKY_USERS_DOC_LINK } from '../../../../../common/constants';
import { LEARN_MORE } from '../../../../overview/components/entity_analytics/risk_score/translations';

const RiskScoreDocLinkComponent = ({
  riskScoreEntity,
  title,
}: {
  riskScoreEntity: RiskScoreEntity;
  title?: string | React.ReactNode;
}) => {
  const docLink =
    riskScoreEntity === RiskScoreEntity.user ? RISKY_USERS_DOC_LINK : RISKY_HOSTS_DOC_LINK;

  return (
    <EuiLink target="_blank" rel="noopener nofollow noreferrer" href={docLink}>
      {title ? title : LEARN_MORE}
    </EuiLink>
  );
};

export const RiskScoreDocLink = React.memo(RiskScoreDocLinkComponent);

RiskScoreDocLink.displayName = 'RiskScoreDocLink';
