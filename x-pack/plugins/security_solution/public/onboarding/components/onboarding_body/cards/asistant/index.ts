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
import { ASISTANT_CARD_TITLE } from './translations';
// import { checkAssistantCardComplete } from './assistant_check_complete';

export const asistantCardConfig: OnboardingCardConfig = {
  id: OnboardingCardId.asistant,
  title: ASISTANT_CARD_TITLE,
  icon: AssistantAvatar,
  // checkComplete: checkAssistantCardComplete,
  Component: React.lazy(() => import('./asistant_card')),
};
