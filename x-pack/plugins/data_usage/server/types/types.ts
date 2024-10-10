/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreRequestHandlerContext,
  CustomRequestHandlerContext,
  IRouter,
  LoggerFactory,
} from '@kbn/core/server';
import { DeepReadonly } from 'utility-types';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { DataUsageConfigType } from '../config';

export interface DataUsageSetupDependencies {
  features: FeaturesPluginSetup;
}

/* eslint-disable @typescript-eslint/no-empty-interface*/
export interface DataUsageStartDependencies {}

export interface DataUsageServerSetup {}

export interface DataUsageServerStart {}

interface DataUsageApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
}

export type DataUsageRequestHandlerContext = CustomRequestHandlerContext<{
  dataUsage: DataUsageApiRequestHandlerContext;
}>;

export type DataUsageRouter = IRouter<DataUsageRequestHandlerContext>;

export interface DataUsageContext {
  logFactory: LoggerFactory;
  serverConfig: DeepReadonly<DataUsageConfigType>;
}
