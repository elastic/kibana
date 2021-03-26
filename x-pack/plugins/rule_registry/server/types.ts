/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Type, TypeOf } from '@kbn/config-schema';
import { ActionVariable, AlertTypeState } from '../../alerting/common';
import { ActionGroup, AlertExecutorOptions } from '../../alerting/server';
import { AlertSeverityLevel } from '../common';
import { DefaultFieldMap } from './rule_registry/defaults/field_map';
import { TypeOfFieldMap } from './rule_registry/field_map/runtime_type_from_fieldmap';
import { FieldMap } from './rule_registry/types';

enum ESFieldType {
  keyword = 'keyword',
  text = 'text',
  date = 'date',
  boolean = 'boolean',
  long = 'long',
  integer = 'integer',
  short = 'short',
  byte = 'byte',
  double = 'double',
  float = 'half_float',
  scaled_float = 'scaled_float',
  unsigned_long = 'unsigned_long',
}

type RuleTypeFieldMap = Record<string, { type: ESFieldType }>;

type RuleParams = Type<any>;

export type AlertContext<TFieldName extends string = string> = Record<
  string,
  {
    description: string;
    field?: TFieldName;
    type: Type<any>;
  }
>;

export interface AlertCheck<TFieldMap extends FieldMap, TActionVariable extends ActionVariable> {
  name: string;
  value?: number;
  threshold?: number;
  context: {
    [key in TActionVariable['name']]: any;
  };
  fields: Omit<Partial<TypeOfFieldMap<TFieldMap>>, keyof DefaultFieldMap>;
}

type TypeOfRuleParams<TRuleParams extends RuleParams> = TypeOf<TRuleParams>;

type RuleExecutorServices<
  TFieldMap extends FieldMap,
  TActionVariable extends ActionVariable
> = Omit<AlertExecutorOptions['services'], 'alertInstanceFactory'> & {
  check: { warning: (check: AlertCheck<TFieldMap, TActionVariable>) => void };
};

type PassthroughAlertExecutorOptions = Pick<
  AlertExecutorOptions,
  'previousStartedAt' | 'startedAt'
>;

type RuleExecutorFunction<
  TFieldMap extends FieldMap,
  TRuleParams extends RuleParams,
  TActionVariable extends ActionVariable
> = (
  options: PassthroughAlertExecutorOptions & {
    services: RuleExecutorServices<TFieldMap, TActionVariable>;
    params: TypeOfRuleParams<TRuleParams>;
  }
) => Promise<Record<string, any>>;

export interface RuleType {
  id: string;
  name: string;
  fields?: RuleTypeFieldMap;
  params?: RuleParams;
  levels?: AlertSeverityLevel[];
  context?: AlertContext;
  actionGroups: Array<ActionGroup<string>>;
  defaultActionGroupId: string;
  producer: string;
  minimumLicenseRequired: 'basic' | 'gold' | 'trial';
  executor: RuleExecutorFunction<FieldMap, RuleParams, ActionVariable>;
}

export type RegisterRuleType<TFieldMap extends FieldMap> = <
  TRuleParams extends RuleParams,
  TActionVariable extends ActionVariable
>(ruleType: {
  id: string;
  name: string;
  validate: {
    params: TRuleParams;
  };
  actionVariables: {
    context: TActionVariable[];
  };
  actionGroups: Array<ActionGroup<string>>;
  defaultActionGroupId: string;
  producer: string;
  minimumLicenseRequired: 'basic' | 'gold' | 'trial';
  executor: RuleExecutorFunction<TFieldMap, TRuleParams, TActionVariable>;
}) => void;

export interface RuleAlertState {
  created: number;
  alertId: string;
}

export type RuleState = AlertTypeState & {
  wrappedRuleState: Record<string, unknown>;
  alerts: Record<string, RuleAlertState>;
};
