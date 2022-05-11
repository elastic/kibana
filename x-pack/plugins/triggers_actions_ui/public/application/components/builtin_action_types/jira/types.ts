/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ExecutorSubActionPushParams } from '@kbn/actions-plugin/server/builtin_action_types/jira/types';
import { UserConfiguredActionConnector } from '../../../../types';

export type JiraActionConnector = UserConfiguredActionConnector<JiraConfig, JiraSecrets>;
export interface JiraActionParams {
  subAction: string;
  subActionParams: ExecutorSubActionPushParams;
}

export interface JiraConfig {
  apiUrl: string;
  projectKey: string;
}

export interface JiraSecrets {
  email: string;
  apiToken: string;
}

export type IssueTypes = Array<{ id: string; name: string }>;

export interface Issue {
  id: string;
  key: string;
  title: string;
}

export interface Fields {
  [key: string]: {
    allowedValues: Array<{ name: string; id: string }> | [];
    defaultValue: { name: string; id: string } | {};
  };
}
