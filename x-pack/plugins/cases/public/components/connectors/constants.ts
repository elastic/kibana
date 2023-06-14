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
  jiraGetFieldsByIssueType: (connectorId: string, issueType: string) =>
    [...connectorsQueriesKeys.jira, connectorId, 'getFields', issueType] as const,
  jiraGetIssueTypes: (connectorId: string) =>
    [...connectorsQueriesKeys.jira, connectorId, 'getIssueType'] as const,
  jiraGetIssues: (connectorId: string, query: string) =>
    [...connectorsQueriesKeys.jira, connectorId, 'getIssues', query] as const,
  resilientGetIncidentTypes: (connectorId: string) =>
    [...connectorsQueriesKeys.resilient, connectorId, 'getIncidentTypes'] as const,
  resilientGetSeverity: (connectorId: string) =>
    [...connectorsQueriesKeys.resilient, connectorId, 'getSeverity'] as const,
  servicenowGetChoices: (connectorId: string, fields: string[]) =>
    [...connectorsQueriesKeys.servicenow, connectorId, 'getChoices', fields] as const,
};
