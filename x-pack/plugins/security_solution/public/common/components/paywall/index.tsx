/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import {
  EuiCard,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiTextColor,
} from '@elastic/eui';
import styled from 'styled-components';
import { useNavigation } from '../../lib/kibana';
import * as i18n from './translations';

const PaywallDiv = styled.div`
  max-width: 85%;
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

export const Paywall = memo(({ featureDescription }: { featureDescription?: string }) => {
  const { getAppUrl, navigateTo } = useNavigation();
  const subscriptionUrl = getAppUrl({
    appId: 'management',
    path: 'stack/license_management',
  });
  const goToSubscription = useCallback(() => {
    navigateTo({ url: subscriptionUrl });
  }, [navigateTo, subscriptionUrl]);
  return (
    <PaywallDiv>
      <EuiCard
        data-test-subj="platinumCard"
        betaBadgeProps={{ label: i18n.PLATINUM }}
        icon={<EuiIcon size="xl" type="lock" />}
        display="subdued"
        title={
          <h3>
            <strong>{i18n.UPGRADE_CTA}</strong>
          </h3>
        }
        description={false}
      >
        <EuiFlexGroup className="platinumCardDescription" direction="column" gutterSize="none">
          <EuiText>
            <EuiFlexItem>
              <p>
                <EuiTextColor color="subdued">
                  {i18n.UPGRADE_MESSAGE(featureDescription)}
                </EuiTextColor>
              </p>
            </EuiFlexItem>
            <EuiFlexItem>
              <div>
                <EuiButton onClick={goToSubscription} fill>
                  {i18n.UPGRADE_BUTTON}
                </EuiButton>
              </div>
            </EuiFlexItem>
          </EuiText>
        </EuiFlexGroup>
      </EuiCard>
    </PaywallDiv>
  );
});

Paywall.displayName = 'Paywall';
