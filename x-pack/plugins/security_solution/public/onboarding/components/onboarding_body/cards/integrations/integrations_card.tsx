/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import type { OnboardingCardComponent } from '../../../../types';
import { OnboardingCardContentWrapper } from '../common/card_content_wrapper';

export const IntegrationsCard: OnboardingCardComponent = ({ setComplete }) => {
  return (
    <OnboardingCardContentWrapper>
      <EuiButton onClick={() => setComplete(false)}>{'Set not complete'}</EuiButton>
    </OnboardingCardContentWrapper>
  );
};

// eslint-disable-next-line import/no-default-export
export default IntegrationsCard;
