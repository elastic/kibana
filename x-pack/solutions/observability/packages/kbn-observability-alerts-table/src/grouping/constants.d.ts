/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export declare const ungrouped: string;
export declare const ruleName: string;
export declare const source: string;
export declare const DEFAULT_GROUPING_OPTIONS: (
  | {
      label: string;
      key: 'kibana.alert.rule.name';
    }
  | {
      label: string;
      key: 'kibana.alert.instance.id';
    }
)[];
