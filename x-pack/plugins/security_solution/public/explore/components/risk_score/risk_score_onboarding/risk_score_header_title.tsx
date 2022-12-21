/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { NavItemBetaBadge } from '../../../../common/components/navigation/nav_item_beta_badge';
import * as i18n from '../../../../overview/components/entity_analytics/common/translations';
import { TECHNICAL_PREVIEW } from './translations';

const RiskScoreHeaderTitleComponent = ({
  riskScoreEntity,
  title,
}: {
  riskScoreEntity: RiskScoreEntity;
  title?: string;
}) => {
  return (
    <>
      {title ??
        (riskScoreEntity === RiskScoreEntity.user ? i18n.USER_RISK_TITLE : i18n.HOST_RISK_TITLE)}
      <NavItemBetaBadge text={TECHNICAL_PREVIEW} className="eui-alignMiddle" />
    </>
  );
};

export const RiskScoreHeaderTitle = React.memo(RiskScoreHeaderTitleComponent);
RiskScoreHeaderTitle.displayName = 'RiskScoreHeaderTitle';
