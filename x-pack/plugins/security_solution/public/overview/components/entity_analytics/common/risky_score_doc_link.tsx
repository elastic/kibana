/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { RISKY_HOSTS_DOC_LINK } from '../../../../../common/constants';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { RISKY_USERS_DOC_LINK } from '../../../../users/components/constants';
import { LEARN_MORE } from '../host_risk_score/translations';

const RiskyScoreDocLinkComponent = ({ riskScoreEntity }: { riskScoreEntity: RiskScoreEntity }) => {
  const link =
    riskScoreEntity === RiskScoreEntity.user ? RISKY_HOSTS_DOC_LINK : RISKY_USERS_DOC_LINK;
  return (
    <EuiLink target="_blank" href={link} external>
      {LEARN_MORE}
    </EuiLink>
  );
};

export const RiskyScoreDocLink = React.memo(RiskyScoreDocLinkComponent);

RiskyScoreDocLink.displayName = 'RiskyScoreDocLink';
