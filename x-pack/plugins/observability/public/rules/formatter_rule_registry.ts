/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { Assign } from 'utility-types';
import { RuleType } from '../../../rule_registry/public';
import { BaseRuleFieldMap, OutputOfFieldMap } from '../../../rule_registry/common';
import { RuleRegistry } from '../../../rule_registry/public';
import { observabilityAlertRt } from '../../common/observability_rule_registry';

type AlertTypeOf<TFieldMap extends BaseRuleFieldMap> = Assign<
  OutputOfFieldMap<TFieldMap>,
  t.OutputOf<typeof observabilityAlertRt>
>;

type FormattableRuleType<TFieldMap extends BaseRuleFieldMap> = RuleType & {
  format?: (options: {
    alert: AlertTypeOf<TFieldMap>;
  }) => {
    reason?: string;
    link?: string;
  };
};

export class FormatterRuleRegistry<TFieldMap extends BaseRuleFieldMap> extends RuleRegistry<
  TFieldMap,
  FormattableRuleType<TFieldMap>
> {}
