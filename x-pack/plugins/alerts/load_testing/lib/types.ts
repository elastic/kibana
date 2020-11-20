/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Scenario {
  name: string;
  sortName?: string;
  version: string;
  esSpec: string;
  kbSpec: string;
  alerts: number;
  alertInterval: string;
  tmPollInterval: number;
  tmMaxWorkers: number;
}

export interface Suite {
  id: string;
  description: string;
  scenarios: Scenario[];
}

export interface CliArguments {
  command: string;
  commandArgs: string[];
  config: string;
  minutes: number;
}

export interface Deployment {
  readonly config: string;
  readonly id: string;
  readonly name: string;
  readonly healthy: boolean;
  readonly status: string;
  readonly version: string;
  readonly zone: string;
  readonly esUrl: string;
  readonly kbUrl: string;
  readonly scenario: Scenario;

  delete(): Promise<void>;
}

export interface DeploymentCtorOptions {
  config: string;
  version: string;
  zone: string;
  id: string;
  name: string;
  healthy: boolean;
  status: string;
  esUrl: string;
  kbUrl: string;
  scenario: Scenario;
}

export interface CreateDeploymentOptions {
  config: string;
  stack: string;
  name: string;
  deploymentName: string;
  esSize: number;
  kbSize: number;
  tmPollInterval: number;
  tmMaxWorkers: number;
}

export interface CreateDeploymentResult {
  id: string;
  username: string;
  password: string;
}

export interface GetDeploymentOptions {
  config: string;
  name: string;
  id: string;
}

export interface GetDeploymentResult {
  healthy: boolean;
  status: string;
  version: string;
  zone: string;
  esEndpoint: string;
  esPort: number;
  kbEndpoint: string;
  kbPort: number;
}

export interface DeleteDeploymentOptions {
  config: string;
  name: string;
  id: string;
}

export interface CommandOptions {
  config: string;
  minutes: number;
}

export type CommandHandler = (options: CommandOptions, args: string[]) => Promise<void>;

export interface EventLogRecord {
  scenario: string;
  provider: string;
  date: string;
  duration: number;
  outcome: string;
  alert?: string;
  action?: string;
}

export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
