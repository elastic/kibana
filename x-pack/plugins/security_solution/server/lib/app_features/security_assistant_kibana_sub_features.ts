/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SubFeatureConfig } from '@kbn/features-plugin/common';

// This is a sample sub-feature that can be used for future implementations
// @ts-expect-error unused variable
const createConversationSubFeature: SubFeatureConfig = {
  name: i18n.translate(
    'xpack.securitySolution.featureRegistry.assistant.createConversationSubFeatureName',
    {
      defaultMessage: 'Create Conversations',
    }
  ),
  description: i18n.translate(
    'xpack.securitySolution.featureRegistry.subFeatures.assistant.description',
    { defaultMessage: 'Create custom conversations.' }
  ),
  privilegeGroups: [
    {
      groupType: 'independent',
      privileges: [
        {
          api: [],
          id: 'create_conversation',
          name: i18n.translate(
            'xpack.securitySolution.featureRegistry.assistant.createConversationSubFeatureDetails',
            {
              defaultMessage: 'Create conversations',
            }
          ),
          includeIn: 'all',
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['createConversation'],
        },
      ],
    },
  ],
};

export enum AssistantSubFeatureId {
  createConversation = 'createConversationSubFeature',
}

// Defines all the ordered Security Assistant subFeatures available
export const assistantSubFeaturesMap = Object.freeze(
  new Map<AssistantSubFeatureId, SubFeatureConfig>([
    // This is a sample sub-feature that can be used for future implementations
    // [AssistantSubFeatureId.createConversation, createConversationSubFeature],
  ])
);
