/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { SubscriptionLink, SubscriptionContext } from '@kbn/subscription-tracking';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { INSIGHTS_UPSELL } from './translations';
import { useNavigation } from '../../../lib/kibana';

const UpsellContainer = euiStyled.div`
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  padding: 12px;
  border-radius: 6px;
`;

const StyledIcon = euiStyled(EuiIcon)`
  margin-right: 10px;
`;

const subscriptionContext: SubscriptionContext = {
  feature: 'alert-details-insights',
  source: 'security::alert-details-flyout',
};

export const RelatedAlertsUpsell = React.memo(() => {
  const { getAppUrl, navigateTo } = useNavigation();

  return (
    <UpsellContainer>
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <StyledIcon size="m" type="lock" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <SubscriptionLink
              color="subdued"
              target="_blank"
              subscriptionContext={subscriptionContext}
            >
              {INSIGHTS_UPSELL}
            </SubscriptionLink>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </UpsellContainer>
  );
});

RelatedAlertsUpsell.displayName = 'RelatedAlertsUpsell';
