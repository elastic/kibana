/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { type BaseKibanaFeatureConfig } from '@kbn/security-solution-features';
import { APP_ID, ASSISTANT_FEATURE_ID } from '../../../common/constants';
import type { AssistantSubFeatureId } from './security_assistant_kibana_sub_features';

export const getAssistantBaseKibanaFeature = (): BaseKibanaFeatureConfig => ({
  id: ASSISTANT_FEATURE_ID,
  name: i18n.translate(
    'xpack.securitySolution.featureRegistry.linkSecuritySolutionAssistantTitle',
    {
      defaultMessage: 'Elastic AI Assistant',
    }
  ),
  order: 1100,
  category: DEFAULT_APP_CATEGORIES.security,
  app: [ASSISTANT_FEATURE_ID, 'kibana'],
  catalogue: [APP_ID],
  minimumLicense: 'enterprise',
  privileges: {
    all: {
      api: [],
      app: [ASSISTANT_FEATURE_ID, 'kibana'],
      catalogue: [APP_ID],
      savedObject: {
        all: [],
        read: [],
      },
      ui: [],
    },
    read: {
      // No read-only mode currently supported
      disabled: true,
      savedObject: {
        all: [],
        read: [],
      },
      ui: [],
    },
  },
});

export const getAssistantBaseKibanaSubFeatureIds = (): AssistantSubFeatureId[] => [
  // This is a sample sub-feature that can be used for future implementations
  // AssistantSubFeatureId.createConversation,
];
