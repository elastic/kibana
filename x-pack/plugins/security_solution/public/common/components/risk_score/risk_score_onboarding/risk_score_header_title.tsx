/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import styled from 'styled-components';

import { EuiIconTip } from '@elastic/eui';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { NavItemBetaBadge } from '../../navigation/nav_item_beta_badge';
import * as i18n from '../../../../overview/components/entity_analytics/common/translations';
import { TECHNICAL_PREVIEW } from './translations';

const IconWrapper = styled.span`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

const RiskScoreHeaderTitleComponent = ({
  riskScoreEntity,
  showTooltip = true,
  title,
}: {
  riskScoreEntity: RiskScoreEntity;
  showTooltip?: boolean;
  title?: string;
}) => {
  return (
    <>
      {title ??
        (riskScoreEntity === RiskScoreEntity.user ? i18n.USER_RISK_TITLE : i18n.HOST_RISK_TITLE)}
      {showTooltip && (
        <IconWrapper>
          <EuiIconTip
            color="subdued"
            content={
              riskScoreEntity === RiskScoreEntity.user
                ? i18n.USER_RISK_TABLE_TOOLTIP
                : i18n.HOST_RISK_TABLE_TOOLTIP
            }
            position="right"
            size="l"
            type="iInCircle"
          />
        </IconWrapper>
      )}
      <NavItemBetaBadge text={TECHNICAL_PREVIEW} className="eui-alignMiddle" />
    </>
  );
};

export const RiskScoreHeaderTitle = React.memo(RiskScoreHeaderTitleComponent);
RiskScoreHeaderTitle.displayName = 'RiskScoreHeaderTitle';
