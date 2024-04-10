/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface ServerlessServerSetup {
  setupProjectSettings(keys: string[]): void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessServerStart {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessServerSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServerlessServerStartDependencies {}
