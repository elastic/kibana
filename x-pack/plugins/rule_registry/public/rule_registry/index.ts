/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseRuleFieldMap } from '../../common';
import type { RuleType, CreateRuleRegistry, RuleRegistryConstructorOptions } from './types';

export class RuleRegistry<TFieldMap extends BaseRuleFieldMap, TRuleType extends RuleType> {
  protected types: TRuleType[] = [];

  constructor(private readonly options: RuleRegistryConstructorOptions<TFieldMap>) {}

  getTypes(): TRuleType[] {
    return this.types;
  }

  getTypeByRuleId(id: string): TRuleType | undefined {
    return this.types.find((type) => type.id === id);
  }

  registerType(type: TRuleType) {
    this.types.push(type);
    if (this.options.parent) {
      this.options.parent.registerType(type);
    } else {
      this.options.alertTypeRegistry.register(type);
    }
  }

  create: CreateRuleRegistry<TFieldMap, TRuleType> = ({ fieldMap, ctor }) => {
    const createOptions = {
      fieldMap: {
        ...this.options.fieldMap,
        ...fieldMap,
      },
      alertTypeRegistry: this.options.alertTypeRegistry,
      parent: this,
    };

    const registry = ctor ? new ctor(createOptions) : new RuleRegistry(createOptions);

    return registry as any;
  };
}
