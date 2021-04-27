/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RuleType } from '../../../rule_registry/public';
import type { BaseRuleFieldMap, OutputOfFieldMap } from '../../../rule_registry/common';
import { RuleRegistry } from '../../../rule_registry/public';
import type { asDuration, asPercent } from '../../common/utils/formatters';

type AlertTypeOf<TFieldMap extends BaseRuleFieldMap> = OutputOfFieldMap<TFieldMap>;

type FormattableRuleType<TFieldMap extends BaseRuleFieldMap> = RuleType & {
  format?: (options: {
    alert: AlertTypeOf<TFieldMap>;
    formatters: {
      asDuration: typeof asDuration;
      asPercent: typeof asPercent;
    };
  }) => {
    reason?: string;
    link?: string;
  };
};

export class FormatterRuleRegistry<TFieldMap extends BaseRuleFieldMap> extends RuleRegistry<
  TFieldMap,
  FormattableRuleType<TFieldMap>
> {}
