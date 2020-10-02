/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fieldLabels as jiraFieldLabels } from './jira';
import { fieldLabels as resilientFieldLabels } from './resilient';
import { fieldLabels as serviceNowFieldLabels } from './servicenow';

export const connectorsFieldLabels: Record<string, Record<string, string> | null> = {
  '.jira': jiraFieldLabels,
  '.resilient': resilientFieldLabels,
  '.servicenow': serviceNowFieldLabels,
  '.none': null,
};
