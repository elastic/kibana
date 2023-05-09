/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const connectorsQueriesKeys = {
  jira: ['jira'] as const,
  resilient: ['resilient'] as const,
  servicenow: ['servicenow'] as const,
  jiraGetFieldsByIssueType: () => [...connectorsQueriesKeys.jira, 'getFields'] as const,
  jiraGetIssueTypes: () => [...connectorsQueriesKeys.jira, 'getIssueType'] as const,
  jiraGetIssues: (query: string) => [...connectorsQueriesKeys.jira, 'getIssues', query] as const,
  resilientGetIncidentTypes: () =>
    [...connectorsQueriesKeys.resilient, 'getIncidentTypes'] as const,
  resilientGetSeverity: () => [...connectorsQueriesKeys.resilient, 'getSeverity'] as const,
  servicenowGetChoices: (fields: string[]) =>
    [...connectorsQueriesKeys.servicenow, 'getChoices', fields] as const,
};
