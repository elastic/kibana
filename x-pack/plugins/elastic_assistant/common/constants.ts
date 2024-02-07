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

// Knowledge Base
export const KNOWLEDGE_BASE = `${BASE_PATH}/knowledge_base/{resource?}`;

// Model Evaluation
export const EVALUATE = `${BASE_PATH}/evaluate`;

// Capabilities
export const CAPABILITIES = `${BASE_PATH}/capabilities`;
