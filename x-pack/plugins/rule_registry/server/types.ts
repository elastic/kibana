/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../alerting/common';
import { AlertExecutorOptions, AlertServices, AlertType } from '../../alerting/server';

export type AlertExecutorOptionsWithExtraServices<
  Params extends AlertTypeParams = never,
  State extends AlertTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never,
  TExtraServices = never
> = Omit<
  AlertExecutorOptions<Params, State, InstanceState, InstanceContext, ActionGroupIds>,
  'services'
> & {
  services: AlertServices<InstanceState, InstanceContext, ActionGroupIds> & TExtraServices;
};

export type ExecutorType<
  Params extends AlertTypeParams = never,
  State extends AlertTypeState = never,
  InstanceState extends AlertInstanceState = never,
  InstanceContext extends AlertInstanceContext = never,
  ActionGroupIds extends string = never
> = (
  options: AlertExecutorOptions<Params, State, InstanceState, InstanceContext, ActionGroupIds>
) => Promise<State | void>;

export type ExecutorTypeWithExtraServices<
  TExecutorType,
  TExtraServices
> = TExecutorType extends ExecutorType<
  infer Params,
  infer State,
  infer InstanceState,
  infer InstanceContext,
  infer ActionGroupIds
>
  ? (
      options: AlertExecutorOptionsWithExtraServices<
        Params,
        State,
        InstanceState,
        InstanceContext,
        ActionGroupIds,
        TExtraServices
      >
    ) => Promise<State | void>
  : never;

export type AlertTypeWithExecutor<
  TParams extends AlertTypeParams = never,
  TState extends AlertTypeState = never,
  TInstanceState extends AlertInstanceState = never,
  TInstanceContext extends AlertInstanceContext = never,
  TActionGroupIds extends string = never,
  TRecoveryActionGroupId extends string = never,
  TExecutorType extends (...args: any[]) => Promise<TState | void> = ExecutorType<
    TParams,
    TState,
    TInstanceState,
    TInstanceContext,
    TActionGroupIds
  >
> = Omit<
  AlertType<
    TParams,
    TState,
    TInstanceState,
    TInstanceContext,
    TActionGroupIds,
    TRecoveryActionGroupId
  >,
  'executor'
> & {
  executor: TExecutorType;
};
