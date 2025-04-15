/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup } from '@kbn/core/server';
import { conversationSoType } from './conversations';
import { agentSoType } from './agents';
import { integrationSoType } from './integrations';

export const registerTypes = ({ savedObjects }: { savedObjects: SavedObjectsServiceSetup }) => {
  savedObjects.registerType(conversationSoType);
  savedObjects.registerType(agentSoType);
  savedObjects.registerType(integrationSoType);
};

export { conversationTypeName, type ConversationAttributes } from './conversations';
export { agentTypeName, type AgentAttributes } from './agents';
export { integrationTypeName, type IntegrationAttributes } from './integrations';
