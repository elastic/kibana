/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type EmailActionType = 'email';
type LoggingActionType = 'logging';
type WebhookActionType = 'webhook';
type IndexActionType = 'index';
type SlackActionType = 'slack';
type JiraActionType = 'jira';
type PagerDutyActionType = 'pagerduty';

export interface BaseAction {
  id: string;
  typeName: string;
  isNew: boolean;
  simulateMessage: string;
  simulateFailMessage: string;
  simulatePrompt: string;
  selectMessage: string;
  validate: () => { [key: string]: string[] };
  isEnabled: boolean;
}

export interface EmailAction extends BaseAction {
  type: EmailActionType;
  iconClass: 'email';
  to: string[];
  subject?: string;
  body: string;
}

export interface LoggingAction extends BaseAction {
  type: LoggingActionType;
  iconClass: 'logsApp';
  text: string;
}

export interface IndexAction extends BaseAction {
  type: IndexActionType;
  iconClass: 'indexOpen';
  index: string;
}

export interface PagerDutyAction extends BaseAction {
  type: PagerDutyActionType;
  iconClass: 'apps';
  description: string;
}

export interface WebhookAction extends BaseAction {
  type: WebhookActionType;
  iconClass: 'logoWebhook';
  method?: 'head' | 'get' | 'post' | 'put' | 'delete';
  host: string;
  port: number;
  scheme?: 'http' | 'https';
  path?: string;
  body?: string;
  username?: string;
  password?: string;
}

export interface SlackAction extends BaseAction {
  type: SlackActionType;
  iconClass: 'logoSlack';
  text?: string;
  to?: string[];
}

export interface JiraAction extends BaseAction {
  type: JiraActionType;
  iconClass: 'apps';
  projectKey: string;
  issueType: string;
  summary: string;
}

export type ActionType =
  | EmailAction
  | LoggingAction
  | IndexAction
  | SlackAction
  | JiraAction
  | PagerDutyAction;
