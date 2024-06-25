/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PLUGIN_ID = 'elasticAssistant';
export const PLUGIN_NAME = 'elasticAssistant';

export const BASE_PATH = '/internal/elastic_assistant';

export const POST_ACTIONS_CONNECTOR_EXECUTE = `${BASE_PATH}/actions/connector/{connectorId}/_execute`;

// Attack discovery
export const ATTACK_DISCOVERY = `${BASE_PATH}/attack_discovery`;

// Model Evaluation
export const EVALUATE = `${BASE_PATH}/evaluate`;

export const MAX_CONVERSATIONS_TO_UPDATE_IN_PARALLEL = 50;
export const CONVERSATIONS_TABLE_MAX_PAGE_SIZE = 100;

export const MAX_ANONYMIZATION_FIELDS_TO_UPDATE_IN_PARALLEL = 50;
export const ANONYMIZATION_FIELDS_TABLE_MAX_PAGE_SIZE = 100;

export const MAX_PROMPTS_TO_UPDATE_IN_PARALLEL = 50;
export const PROMPTS_TABLE_MAX_PAGE_SIZE = 100;

// Knowledge Base
export const KNOWLEDGE_BASE_ENTRIES_TABLE_MAX_PAGE_SIZE = 100;

// Capabilities
export const CAPABILITIES = `${BASE_PATH}/capabilities`;

/**
 Licensing requirements
 */
export const MINIMUM_AI_ASSISTANT_LICENSE = 'enterprise' as const;
