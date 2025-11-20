/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Duplicate of the attachment type ID defined in @kbn/observability-agent-plugin/server/attachments/error_context.ts
// Re-defined here to avoid cross-plugin dependency cycles
export const OBSERVABILITY_ERROR_CONTEXT_ATTACHMENT_TYPE_ID = 'observability.error_context';
