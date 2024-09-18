/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentPanel } from '../common/card_content_panel';
import { CardCallOut } from '../common/card_callout';

export const IntegrationsCard: OnboardingCardComponent = ({
  setComplete,
  checkCompleteMetadata, // this is undefined before the first checkComplete call finishes
}) => {
  // TODO: implement. This is just for demo purposes
  return (
    <OnboardingCardContentPanel>
      <EuiFlexGroup gutterSize="m" direction="column" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          {checkCompleteMetadata ? (
            <CardCallOut
              text={`${checkCompleteMetadata.integrationsInstalled} integrations installed`}
            />
          ) : (
            <EuiLoadingSpinner size="s" />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton onClick={() => setComplete(false)}>{'Set not complete'}</EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </OnboardingCardContentPanel>
  );
};

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
