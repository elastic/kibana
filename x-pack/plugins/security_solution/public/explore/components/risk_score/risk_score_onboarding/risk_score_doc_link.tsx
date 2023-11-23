/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React, { useMemo } from 'react';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import {
  RISKY_HOSTS_DOC_LINK,
  RISKY_USERS_DOC_LINK,
  RISKY_ENTITY_SCORE_DOC_LINK,
} from '../../../../../common/constants';
import { LEARN_MORE } from '../../../../overview/components/entity_analytics/risk_score/translations';

const RiskScoreDocLinkComponent = ({
  riskScoreEntity,
  title,
}: {
  riskScoreEntity?: RiskScoreEntity;
  title?: string | React.ReactNode;
}) => {
  const docLink = useMemo(() => {
    if (!riskScoreEntity) {
      return RISKY_ENTITY_SCORE_DOC_LINK;
    }
    if (riskScoreEntity === RiskScoreEntity.user) {
      return RISKY_USERS_DOC_LINK;
    }
    return RISKY_HOSTS_DOC_LINK;
  }, [riskScoreEntity]);

  return (
    <EuiLink target="_blank" rel="noopener nofollow noreferrer" href={docLink}>
      {title ? title : LEARN_MORE(riskScoreEntity)}
    </EuiLink>
  );
};

export const RiskScoreDocLink = React.memo(RiskScoreDocLinkComponent);

RiskScoreDocLink.displayName = 'RiskScoreDocLink';
