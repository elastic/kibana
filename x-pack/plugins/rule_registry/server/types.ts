/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Type, TypeOf } from '@kbn/config-schema';
import { Logger } from 'kibana/server';
import {
  ActionVariable,
  AlertInstanceContext,
  AlertInstanceState,
  AlertTypeParams,
  AlertTypeState,
} from '../../alerting/common';
import { ActionGroup, AlertExecutorOptions } from '../../alerting/server';
import { RuleRegistry } from './rule_registry';
import { ScopedRuleRegistryClient } from './rule_registry/create_scoped_rule_registry_client/types';
import { BaseRuleFieldMap } from '../common';

export type RuleParams = Type<any>;

type TypeOfRuleParams<TRuleParams extends RuleParams> = TypeOf<TRuleParams>;

type RuleExecutorServices<
  TFieldMap extends BaseRuleFieldMap,
  TActionVariable extends ActionVariable
> = AlertExecutorOptions<
  AlertTypeParams,
  AlertTypeState,
  AlertInstanceState,
  { [key in TActionVariable['name']]: any },
  string
>['services'] & {
  logger: Logger;
  scopedRuleRegistryClient?: ScopedRuleRegistryClient<TFieldMap>;
};

type PassthroughAlertExecutorOptions = Pick<
  AlertExecutorOptions<
    AlertTypeParams,
    AlertTypeState,
    AlertInstanceState,
    AlertInstanceContext,
    string
  >,
  'previousStartedAt' | 'startedAt' | 'state'
>;

type RuleExecutorFunction<
  TFieldMap extends BaseRuleFieldMap,
  TRuleParams extends RuleParams,
  TActionVariable extends ActionVariable,
  TAdditionalRuleExecutorServices extends Record<string, any>
> = (
  options: PassthroughAlertExecutorOptions & {
    services: RuleExecutorServices<TFieldMap, TActionVariable> & TAdditionalRuleExecutorServices;
    params: TypeOfRuleParams<TRuleParams>;
    rule: {
      id: string;
      uuid: string;
      name: string;
      category: string;
    };
    producer: string;
  }
) => Promise<Record<string, any>>;

interface RuleTypeBase {
  id: string;
  name: string;
  actionGroups: Array<ActionGroup<string>>;
  defaultActionGroupId: string;
  producer: string;
  minimumLicenseRequired: 'basic' | 'gold' | 'trial';
}

export type RuleType<
  TFieldMap extends BaseRuleFieldMap,
  TRuleParams extends RuleParams,
  TActionVariable extends ActionVariable,
  TAdditionalRuleExecutorServices extends Record<string, any> = {}
> = RuleTypeBase & {
  validate: {
    params: TRuleParams;
  };
  actionVariables: {
    context: TActionVariable[];
  };
  executor: RuleExecutorFunction<
    TFieldMap,
    TRuleParams,
    TActionVariable,
    TAdditionalRuleExecutorServices
  >;
};

export type FieldMapOf<
  TRuleRegistry extends RuleRegistry<any>
> = TRuleRegistry extends RuleRegistry<infer TFieldMap> ? TFieldMap : never;
