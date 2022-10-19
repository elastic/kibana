/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiCard,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextColor,
  EuiImage,
} from '@elastic/eui';
import styled from 'styled-components';
import { SubscriptionButton } from '@kbn/subscription-tracking';
import type { SubscriptionContext } from '@kbn/subscription-tracking';
import * as i18n from './translations';
import paywallPng from '../../images/entity_paywall.png';

const PaywallDiv = styled.div`
  max-width: 75%;
  margin: 0 auto;
  .euiCard__betaBadgeWrapper {
    .euiCard__betaBadge {
      width: auto;
    }
  }
  .platinumCardDescription {
    padding: 0 15%;
  }
`;
const StyledEuiCard = styled(EuiCard)`
  span.euiTitle {
    max-width: 540px;
    display: block;
    margin: 0 auto;
  }
`;

const subscriptionContext: SubscriptionContext = {
  feature: 'entity-analytics',
  source: 'security__entity-analytics',
};

export const Paywall = memo(({ heading }: { heading?: string }) => {
  return (
    <PaywallDiv>
      <StyledEuiCard
        data-test-subj="platinumCard"
        betaBadgeProps={{ label: i18n.PLATINUM }}
        icon={<EuiIcon size="xl" type="lock" />}
        display="subdued"
        title={
          <h3>
            <strong>{heading}</strong>
          </h3>
        }
        description={false}
        paddingSize="xl"
      >
        <EuiFlexGroup className="platinumCardDescription" direction="column" gutterSize="none">
          <EuiText>
            <EuiFlexItem>
              <p>
                <EuiTextColor color="subdued">{i18n.UPGRADE_MESSAGE}</EuiTextColor>
              </p>
            </EuiFlexItem>
            <EuiFlexItem>
              <div>
                <SubscriptionButton subscriptionContext={subscriptionContext} fill>
                  {i18n.UPGRADE_BUTTON}
                </SubscriptionButton>
              </div>
            </EuiFlexItem>
          </EuiText>
        </EuiFlexGroup>
      </StyledEuiCard>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiImage alt={i18n.UPGRADE_MESSAGE} src={paywallPng} size="fullWidth" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </PaywallDiv>
  );
});

Paywall.displayName = 'Paywall';
