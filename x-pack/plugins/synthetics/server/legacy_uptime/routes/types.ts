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
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { UMServerLibs, UptimeESClient } from '../lib/lib';
import type { UptimeRequestHandlerContext } from '../../types';
import { UptimeServerSetup } from '../lib/adapters';

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

/**
 * This is an abstraction over the default Kibana route type. This allows us to use custom
 * arguments in our route handlers and impelement custom middleware.
 */
export type UptimeRoute = UMRouteDefinition<UMRouteHandler>;

/**
 * Functions of this type accept custom lib functions and outputs a route object.
 */
export type UMRestApiRouteFactory = (libs: UMServerLibs) => UptimeRoute;
export type SyntheticsRestApiRouteFactory = (libs: UMServerLibs) => SyntheticsRoute;
export type SyntheticsStreamingRouteFactory = (libs: UMServerLibs) => SyntheticsStreamingRoute;

/**
 * Functions of this type accept our internal route format and output a route
 * object that the Kibana platform can consume.
 */
export type UMKibanaRouteWrapper = (
  uptimeRoute: UptimeRoute,
  server: UptimeServerSetup
) => UMKibanaRoute;

export type SyntheticsRoute = UMRouteDefinition<SyntheticsRouteHandler>;
export type SyntheticsStreamingRoute = UMRouteDefinition<SyntheticsStreamingRouteHandler>;

export type SyntheticsRouteWrapper = (
  uptimeRoute: SyntheticsRoute | SyntheticsStreamingRoute,
  server: UptimeServerSetup,
  syntheticsMonitorClient: SyntheticsMonitorClient
) => UMKibanaRoute;

/**
 * This is the contract we specify internally for route handling.
 */
export type UMRouteHandler = ({
  uptimeEsClient,
  context,
  request,
  response,
  server,
  savedObjectsClient,
  subject,
}: {
  uptimeEsClient: UptimeESClient;
  context: UptimeRequestHandlerContext;
  request: SyntheticsRequest;
  response: KibanaResponseFactory;
  savedObjectsClient: SavedObjectsClientContract;
  server: UptimeServerSetup;
  subject?: Subject<unknown>;
}) => IKibanaResponse<any> | Promise<IKibanaResponse<any>>;

export type SyntheticsRouteHandler = ({
  uptimeEsClient,
  context,
  request,
  response,
  server,
  savedObjectsClient,
  subject: Subject,
}: {
  uptimeEsClient: UptimeESClient;
  context: UptimeRequestHandlerContext;
  request: SyntheticsRequest;
  response: KibanaResponseFactory;
  savedObjectsClient: SavedObjectsClientContract;
  server: UptimeServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  subject?: Subject<unknown>;
}) => IKibanaResponse<any> | Promise<IKibanaResponse<any>>;

export type SyntheticsStreamingRouteHandler = ({
  uptimeEsClient,
  context,
  request,
  server,
  savedObjectsClient,
  subject: Subject,
}: {
  uptimeEsClient: UptimeESClient;
  context: UptimeRequestHandlerContext;
  request: SyntheticsRequest;
  savedObjectsClient: SavedObjectsClientContract;
  server: UptimeServerSetup;
  syntheticsMonitorClient: SyntheticsMonitorClient;
  subject?: Subject<unknown>;
}) => IKibanaResponse<any> | Promise<IKibanaResponse<any>>;
