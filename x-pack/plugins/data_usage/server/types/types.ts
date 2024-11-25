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
  PluginInitializerContext,
} from '@kbn/core/server';
import { DeepReadonly } from 'utility-types';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { Observable } from 'rxjs';
import { DataUsageConfigType } from '../config';

export interface DataUsageSetupDependencies {
  features: FeaturesPluginSetup;
  cloud: CloudSetup;
}

/* eslint-disable @typescript-eslint/no-empty-interface*/
export interface DataUsageStartDependencies {}

export interface DataUsageServerSetup {}

export interface DataUsageServerStart {}

interface DataUsageApiRequestHandlerContext {
  core: CoreRequestHandlerContext;
  logFactory: LoggerFactory;
}

export type DataUsageRequestHandlerContext = CustomRequestHandlerContext<{
  dataUsage: DataUsageApiRequestHandlerContext;
}>;

export type DataUsageRouter = IRouter<DataUsageRequestHandlerContext>;

export interface AutoOpsConfig {
  enabled?: boolean;
  api?: {
    url?: string;
    tls?: {
      certificate?: string;
      key?: string;
      ca?: string;
    };
  };
}

export interface DataUsageContext {
  logFactory: LoggerFactory;
  config$?: Observable<DataUsageConfigType>;
  configInitialValue: DataUsageConfigType;
  serverConfig: DeepReadonly<DataUsageConfigType>;
  kibanaVersion: PluginInitializerContext['env']['packageInfo']['version'];
  kibanaBranch: PluginInitializerContext['env']['packageInfo']['branch'];
  kibanaInstanceId: PluginInitializerContext['env']['instanceUuid'];
  cloud?: CloudSetup;
}
