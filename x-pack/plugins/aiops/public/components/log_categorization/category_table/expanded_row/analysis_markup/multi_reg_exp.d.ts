/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export declare class MultiRegExp2 {
  constructor(baseRegExp: RegExp);
  public execForAllGroups(
    string: string,
    includeFullMatch?: boolean
  ): Array<{ match: string; start: number; end: number }>;
  public execForGroup(string: string, group: number): { match: string; start: number; end: number };
}
