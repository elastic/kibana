/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum BulkActionTaskType {
  REASSIGN_RETRY = 'fleet:reassign_action:retry',
  UNENROLL_RETRY = 'fleet:unenroll_action:retry',
  UPGRADE_RETRY = 'fleet:upgrade_action:retry',
  UPDATE_AGENT_TAGS_RETRY = 'fleet:update_agent_tags:retry',
  REQUEST_DIAGNOSTICS_RETRY = 'fleet:request_diagnostics:retry',
}
