/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AssistantAvatar } from '@kbn/elastic-assistant';
import type { OnboardingCardConfig } from '../../../../../types';
import { OnboardingCardId } from '../../../../../constants';
import { AI_CONNECTOR_CARD_TITLE } from './translations';
import { checkAiConnectorsCardComplete } from './connectors_check_complete';
import type { AIConnectorCardMetadata } from './types';

export const aiConnectorCardConfig: OnboardingCardConfig<AIConnectorCardMetadata> = {
  id: OnboardingCardId.siemMigrationsAiConnectors,
  title: AI_CONNECTOR_CARD_TITLE,
  icon: AssistantAvatar,
  Component: React.lazy(
    () =>
      import(
        /* webpackChunkName: "onboarding_siem_migrations_ai_connector_card" */
        './ai_connector_card'
      )
  ),
  checkComplete: checkAiConnectorsCardComplete,
  licenseTypeRequired: 'enterprise',
};
