/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { OnboardingCardComponent } from '../../../../types';
import * as i18n from './translations';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { ConfigureConnector } from './components/configure_connector/configure_connector';

export const AsistantCard: OnboardingCardComponent = ({
  isCardComplete,
  setExpandedCardId,
  setComplete,
}) => {
  return (
    <OnboardingCardContentPanel paddingSize="none">
      <EuiFlexGroup direction="column">
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {i18n.ASISTANT_CARD_DESCRIPTION}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <ConfigureConnector setComplete={setComplete} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default AsistantCard;
