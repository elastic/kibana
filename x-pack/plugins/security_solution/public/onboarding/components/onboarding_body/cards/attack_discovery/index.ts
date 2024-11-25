/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { OnboardingCardConfig } from '../../../../types';
import { OnboardingCardId } from '../../../../constants';
import { ATTACK_DISCOVERY_CARD_TITLE } from './translations';
import attackDiscoveryIcon from './images/attack_discovery_icon.png';

export const attackDiscoveryCardConfig: OnboardingCardConfig = {
  id: OnboardingCardId.attackDiscovery,
  title: ATTACK_DISCOVERY_CARD_TITLE,
  icon: attackDiscoveryIcon,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_attack_discovery_card" */
        './attack_discovery_card'
      )
  ),
  capabilities: 'securitySolutionAttackDiscovery.attack-discovery',
  licenseType: 'enterprise',
};
