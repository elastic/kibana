/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserConfiguredActionConnector } from '../../../types';

export interface EmailActionParams {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  message: string;
}

export enum EventActionOptions {
  TRIGGER = 'trigger',
  RESOLVE = 'resolve',
  ACKNOWLEDGE = 'acknowledge',
}

export enum SeverityActionOptions {
  CRITICAL = 'critical',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

export interface PagerDutyActionParams {
  eventAction?: EventActionOptions;
  dedupKey?: string;
  summary?: string;
  source?: string;
  severity?: SeverityActionOptions;
  timestamp?: string;
  component?: string;
  group?: string;
  class?: string;
}

export interface IndexActionParams {
  documents: Array<Record<string, any>>;
}

export enum ServerLogLevelOptions {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export interface ServerLogActionParams {
  level?: ServerLogLevelOptions;
  message: string;
}

export interface SlackActionParams {
  message: string;
}

export interface TeamsActionParams {
  message: string;
}

export interface WebhookActionParams {
  body?: string;
}

export interface EmailConfig {
  from: string;
  host: string;
  port: number;
  secure?: boolean;
  hasAuth: boolean;
}

export interface EmailSecrets {
  user: string | null;
  password: string | null;
}

export type EmailActionConnector = UserConfiguredActionConnector<EmailConfig, EmailSecrets>;

export interface EsIndexConfig {
  index: string;
  executionTimeField?: string | null;
  refresh?: boolean;
}

export type EsIndexActionConnector = UserConfiguredActionConnector<EsIndexConfig, unknown>;

export interface PagerDutyConfig {
  apiUrl?: string;
}

export interface PagerDutySecrets {
  routingKey: string;
}

export type PagerDutyActionConnector = UserConfiguredActionConnector<
  PagerDutyConfig,
  PagerDutySecrets
>;

export interface SlackSecrets {
  webhookUrl: string;
}

export type SlackActionConnector = UserConfiguredActionConnector<unknown, SlackSecrets>;

export interface WebhookConfig {
  method: string;
  url: string;
  headers: Record<string, string>;
  hasAuth: boolean;
}

export interface WebhookSecrets {
  user: string;
  password: string;
}

export type WebhookActionConnector = UserConfiguredActionConnector<WebhookConfig, WebhookSecrets>;

export interface TeamsSecrets {
  webhookUrl: string;
}

export type TeamsActionConnector = UserConfiguredActionConnector<unknown, TeamsSecrets>;
