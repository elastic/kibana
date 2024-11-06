/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamsAPIClient } from './api';

/* eslint-disable @typescript-eslint/no-empty-interface*/

export interface ConfigSchema {}

export interface StreamsAPISetupDependencies {}

export interface StreamsAPIStartDependencies {}

export interface StreamsAPIPublicSetup {
  streamsAPIClient: StreamsAPIClient;
}

export interface StreamsAPIPublicStart {
  streamsAPIClient: StreamsAPIClient;
}
