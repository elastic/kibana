/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Represents a Role Mapping rule.
 */
export abstract class Rule {
  /**
   * Converts this rule into a raw object for use in the persisted Role Mapping.
   */
  abstract toRaw(): Record<string, any>;

  /**
   * The display title for this rule.
   */
  abstract getDisplayTitle(): string;

  /**
   * Returns a new instance of this rule.
   */
  abstract clone(): Rule;
}
