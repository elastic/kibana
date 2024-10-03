/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeaturesPluginSetup } from '@kbn/features-plugin/server';

export interface DataUsageSetupDependencies {
  features: FeaturesPluginSetup;
}

/* eslint-disable @typescript-eslint/no-empty-interface*/
export interface DataUsageStartDependencies {}

export interface DataUsageServerSetup {}

export interface DataUsageServerStart {}
