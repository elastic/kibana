/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AlertTypeRegistryContract } from '../../../triggers_actions_ui/public';
import type { BaseRuleFieldMap, FieldMap } from '../../common';

export interface RuleRegistryConstructorOptions<TFieldMap extends BaseRuleFieldMap> {
  fieldMap: TFieldMap;
  alertTypeRegistry: AlertTypeRegistryContract;
  parent?: IRuleRegistry<any, any>;
}

export type RuleType = Parameters<AlertTypeRegistryContract['register']>[0];

export type RegisterRuleType<
  TFieldMap extends BaseRuleFieldMap,
  TAdditionalRegisterOptions = {}
> = (type: RuleType & TAdditionalRegisterOptions) => void;

export type RuleRegistryExtensions<T extends keyof any = never> = Record<
  T,
  (...args: any[]) => any
>;

export type CreateRuleRegistry<
  TFieldMap extends BaseRuleFieldMap,
  TRuleType extends RuleType,
  TInstanceType = undefined
> = <
  TNextFieldMap extends FieldMap,
  TRuleRegistryInstance extends IRuleRegistry<
    TFieldMap & TNextFieldMap,
    any
  > = TInstanceType extends IRuleRegistry<TFieldMap & TNextFieldMap, TRuleType>
    ? TInstanceType
    : IRuleRegistry<TFieldMap & TNextFieldMap, TRuleType>
>(options: {
  fieldMap: TNextFieldMap;
  ctor?: new (
    options: RuleRegistryConstructorOptions<TFieldMap & TNextFieldMap>
  ) => TRuleRegistryInstance;
}) => TRuleRegistryInstance;

export interface IRuleRegistry<
  TFieldMap extends BaseRuleFieldMap,
  TRuleType extends RuleType,
  TInstanceType = undefined
> {
  create: CreateRuleRegistry<TFieldMap, TRuleType, TInstanceType>;
  registerType(type: TRuleType): void;
  getTypeByRuleId(ruleId: string): TRuleType;
  getTypes(): TRuleType[];
}

export type FieldMapOfRuleRegistry<TRuleRegistry> = TRuleRegistry extends IRuleRegistry<
  infer TFieldMap,
  any
>
  ? TFieldMap
  : never;
