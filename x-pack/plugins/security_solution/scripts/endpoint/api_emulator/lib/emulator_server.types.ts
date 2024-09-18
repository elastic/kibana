/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type HapiTypes from '@hapi/hapi';

export interface EmulatorServerPluginRegisterOptions<TServices extends Record<string, any> = {}> {
  router: {
    route(route: EmulatorServerRouteDefinition | EmulatorServerRouteDefinition[]): void;
  };

  /**
   * Expose content on the server related to the plugin
   *
   * @param key
   * @param value
   *
   * @see https://hapi.dev/api/?v=21.3.3#-serverexposekey-value-options
   */
  expose: (key: string, value: any) => void;

  /**
   * Core services defined at the server level
   */
  services: TServices;
}

export interface EmulatorServerPlugin<TServices extends Record<string, any> = any>
  extends Omit<HapiTypes.PluginBase<unknown>, 'register'> {
  register: (options: EmulatorServerPluginRegisterOptions<TServices>) => void | Promise<void>;
  name: string;
  /**
   * A prefix for the routes that will be registered via this plugin. Default is the plugin's `name`
   */
  prefix?: Required<HapiTypes.ServerRegisterOptions>['routes']['prefix'];
}

export interface EmulatorServerRequest<
  TParams extends HapiTypes.Request['params'] = any,
  TQuery extends HapiTypes.Request['query'] = any,
  TPayload extends HapiTypes.Request['payload'] = any,
  TPre extends HapiTypes.Request['pre'] = any
> extends HapiTypes.Request {
  params: TParams;
  query: TQuery;
  payload: TPayload;
  pre: TPre;
}

export type EmulatorServerRouteHandlerMethod<
  TParams extends HapiTypes.Request['params'] = any,
  TQuery extends HapiTypes.Request['query'] = any,
  TPayload extends HapiTypes.Request['payload'] = any,
  TPre extends HapiTypes.Request['pre'] = any
> = (
  request: EmulatorServerRequest<TParams, TQuery, TPayload, TPre>,
  h: HapiTypes.ResponseToolkit,
  err?: Error
) => HapiTypes.Lifecycle.ReturnValue;

export interface EmulatorServerRouteDefinition<
  TParams extends HapiTypes.Request['params'] = any,
  TQuery extends HapiTypes.Request['query'] = any,
  TPayload extends HapiTypes.Request['payload'] = any,
  TPre extends HapiTypes.Request['pre'] = any
> extends Omit<HapiTypes.ServerRoute, 'handler'> {
  handler: EmulatorServerRouteHandlerMethod<TParams, TQuery, TPayload, TPre>;
}
