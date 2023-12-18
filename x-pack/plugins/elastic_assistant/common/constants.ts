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

export const MAX_CONVERSATIONS_TO_UPDATE_IN_PARALLEL = 50;
export const CONVERSATIONS_TABLE_MAX_PAGE_SIZE = 100;

export const ELASTIC_AI_ASSISTANT_API_CURRENT_VERSION = '2023-10-31';
export const ELASTIC_AI_ASSISTANT_URL = '/api/elastic_assistant';
export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL = `${ELASTIC_AI_ASSISTANT_URL}/conversations`;
export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BY_ID = `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/{conversationId}`;
export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_CREATE = `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/_bulk_create`;
export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_DELETE = `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/_bulk_delete`;
export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_UPDATE = `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/_bulk_update`;
export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_BULK_ACTION = `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/_bulk_action`;
export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND = `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/_find`;
export const ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL_FIND_USER_CONVERSATIONS = `${ELASTIC_AI_ASSISTANT_CONVERSATIONS_URL}/_find_user`;
