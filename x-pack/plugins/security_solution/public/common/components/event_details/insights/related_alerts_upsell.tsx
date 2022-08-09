/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';

import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { ALERT_UPSELL } from './translations';

const UpsellContainer = euiStyled.a`
  border: 1px solid ${({ theme }) => theme.eui.euiColorLightShade};
  padding: 12px;
  border-radius: 6px;
  color: ${({ theme }) => theme.eui.euiTextSubduedColor};

  &:focus, &:hover {
    text-decoration: underline;
  }
`;

const StyledIcon = euiStyled(EuiIcon)`
  margin-right: 10px;
`;

export const RelatedAlertsUpsell = React.memo(() => {
  return (
    <UpsellContainer href="https://www.elastic.co/pricing/" target="_blank">
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <StyledIcon size="m" type="lock" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">{ALERT_UPSELL}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </UpsellContainer>
  );
});

RelatedAlertsUpsell.displayName = 'RelatedAlertsUpsell';
