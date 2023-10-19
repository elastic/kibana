/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Actions Connector Execute (LLM Wrapper)
export { postActionsConnectorExecuteRoute } from './post_actions_connector_execute';

// Knowledge Base
export { deleteKnowledgeBaseRoute } from './knowledge_base/delete_knowledge_base';
export { getKnowledgeBaseStatusRoute } from './knowledge_base/get_knowledge_base_status';
export { postKnowledgeBaseRoute } from './knowledge_base/post_knowledge_base';

// Evaluate
export { postEvaluateRoute } from './evaluate/post_evaluate';
