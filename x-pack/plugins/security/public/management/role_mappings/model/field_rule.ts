/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Rule } from './rule';

/** The allowed types for field rule values */
export type FieldRuleValue =
  | string
  | number
  | null
  | boolean
  | Array<string | number | null | boolean>;

/**
 * Represents a single field rule.
 * Ex: "username = 'foo'"
 */
export class FieldRule extends Rule {
  constructor(public readonly field: string, public readonly value: FieldRuleValue) {
    super();
  }

  /** {@see Rule.getDisplayTitle} */
  public getDisplayTitle() {
    return i18n.translate('xpack.security.management.editRoleMapping.fieldRule.displayTitle', {
      defaultMessage: 'The following is true',
    });
  }

  /** {@see Rule.clone} */
  public clone() {
    return new FieldRule(this.field, Array.isArray(this.value) ? [...this.value] : this.value);
  }

  /** {@see Rule.toRaw} */
  public toRaw() {
    return {
      field: {
        [this.field]: Array.isArray(this.value) ? [...this.value] : this.value,
      },
    };
  }
}
