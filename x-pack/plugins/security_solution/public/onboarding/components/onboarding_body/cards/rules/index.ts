/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { OnboardingCardConfig } from '../../../../types';
import { OnboardingCardId } from '../../../../constants';
import { RULES_CARD_TITLE } from './translations';
import rulesIcon from './images/rules_icon.png';

export const rulesCardConfig: OnboardingCardConfig = {
  id: OnboardingCardId.rules,
  title: RULES_CARD_TITLE,
  icon: rulesIcon,
  Component: React.lazy(() => import('./rules_card')),
};
