/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subject } from 'rxjs';
import { ObjectType } from '@kbn/config-schema';
import {
  RequestHandler,
  RouteConfig,
  RouteMethod,
  SavedObjectsClientContract,
  KibanaRequest,
  KibanaResponseFactory,
  IKibanaResponse,
} from '@kbn/core/server';
import { UptimeEsClient } from '../lib';
import { SyntheticsServerSetup, UptimeRequestHandlerContext } from '../types';
import { SyntheticsMonitorClient } from '../synthetics_service/synthetics_monitor/synthetics_monitor_client';
export type SyntheticsRequest = KibanaRequest<
  Record<string, any>,
  Record<string, any>,
  Record<string, any>
>;

/**
 * Defines the basic properties employed by Uptime routes.
 */
export interface UMServerRoute<T> {
  method: 'GET' | 'PUT' | 'POST' | 'DELETE';
  writeAccess?: boolean;
  handler: T;
  streamHandler?: (
    context: UptimeRequestHandlerContext,
    request: SyntheticsRequest,
    subject: Subject<unknown>
  ) => IKibanaResponse<any> | Promise<IKibanaResponse<any>>;
}

/**
 * Merges basic uptime route properties with the route config type
 * provided by Kibana core.
 */
export type UMRouteDefinition<T> = UMServerRoute<T> &
  RouteConfig<ObjectType, ObjectType, ObjectType, RouteMethod>;

/**
 * This type represents an Uptime route definition that corresponds to the contract
 * provided by the Kibana platform. Route objects must conform to this type in order
 * to successfully interact with the Kibana platform.
 */
export type UMKibanaRoute = UMRouteDefinition<
  RequestHandler<ObjectType, ObjectType, ObjectType, UptimeRequestHandlerContext>
>;

export type SyntheticsRestApiRouteFactory<
  ClientContract = any,
  QueryParams = Record<string, any>
> = () => SyntheticsRoute<ClientContract, QueryParams>;

export type SyntheticsRoute<
  ClientContract = unknown,
  QueryParams = Record<string, any>
> = UMRouteDefinition<SyntheticsRouteHandler<ClientContract, QueryParams>>;

export type SyntheticsRouteWrapper = (
  uptimeRoute: SyntheticsRoute<Record<string, unknown>>,
  server: SyntheticsServerSetup,
  syntheticsMonitorClient: SyntheticsMonitorClient
) => UMKibanaRoute;

export interface UptimeRouteContext {
  uptimeEsClient: UptimeEsClient;
  context: UptimeRequestHandlerContext;
  request: SyntheticsRequest;
  response: KibanaResponseFactory;
  savedObjectsClient: SavedObjectsClientContract;
  server: SyntheticsServerSetup;
  subject?: Subject<unknown>;
}

export interface RouteContext<Query = Record<string, any>> {
  uptimeEsClient: UptimeEsClient;
  context: UptimeRequestHandlerContext;
  request: KibanaRequest<Record<string, any>, Query, Record<string, any>>;
  response: KibanaResponseFactory;
  savedObjectsClient: SavedObjectsClientContract;
  server: SyntheticsServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  subject?: Subject<unknown>;
  spaceId: string;
}

export type SyntheticsRouteHandler<ClientContract = unknown, QueryParams = Record<string, any>> = ({
  uptimeEsClient,
  context,
  request,
  response,
  server,
  savedObjectsClient,
  subject: Subject,
}: RouteContext<QueryParams>) => Promise<IKibanaResponse<ClientContract> | ClientContract>;
