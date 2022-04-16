/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// See: https://github.com/elastic/kibana/issues/117255, this creates mocks to avoid memory leaks from kibana core.

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { TaskStatus } from '@kbn/task-manager-plugin/server/task';
module.exports = {
  TaskStatus,
};
