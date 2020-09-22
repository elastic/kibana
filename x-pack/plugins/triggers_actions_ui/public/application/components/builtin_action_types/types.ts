/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ActionConnector } from '../../../types';

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

export interface WebhookActionParams {
  body?: string;
}

interface EmailConfig {
  from: string;
  host: string;
  port: number;
  secure?: boolean;
  hasAuth?: boolean;
}

interface EmailSecrets {
  user: string | null;
  password: string | null;
}

export interface EmailActionConnector extends ActionConnector {
  config: EmailConfig;
  secrets: EmailSecrets;
}

interface EsIndexConfig {
  index: string;
  executionTimeField?: string | null;
  refresh?: boolean;
}

export interface EsIndexActionConnector extends ActionConnector {
  config: EsIndexConfig;
}

interface PagerDutyConfig {
  apiUrl?: string;
}

interface PagerDutySecrets {
  routingKey: string;
}

export interface PagerDutyActionConnector extends ActionConnector {
  config: PagerDutyConfig;
  secrets: PagerDutySecrets;
}

interface SlackSecrets {
  webhookUrl: string;
}

export interface SlackActionConnector extends ActionConnector {
  secrets: SlackSecrets;
}

interface WebhookConfig {
  method: string;
  url: string;
  headers: Record<string, string>;
}

interface WebhookSecrets {
  user: string;
  password: string;
}

export interface WebhookActionConnector extends ActionConnector {
  config: WebhookConfig;
  secrets: WebhookSecrets;
}
