/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AssistantAvatar } from '@kbn/elastic-assistant';
import type { OnboardingCardConfig } from '../../../../types';
import { OnboardingCardId } from '../../../../constants';
import { ASSISTANT_CARD_TITLE } from './translations';
import { checkAssistantCardComplete } from './assistant_check_complete';
import type { AssistantCardMetadata } from './types';

export const assistantCardConfig: OnboardingCardConfig<AssistantCardMetadata> = {
  id: OnboardingCardId.assistant,
  title: ASSISTANT_CARD_TITLE,
  icon: AssistantAvatar,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_assistant_card" */
        './assistant_card'
      )
  ),
  checkComplete: checkAssistantCardComplete,
  capabilitiesRequired: ['securitySolutionAssistant.ai-assistant'],
  licenseTypeRequired: 'enterprise',
};
