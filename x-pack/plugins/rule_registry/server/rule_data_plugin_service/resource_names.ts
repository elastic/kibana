/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const joinWithDash = (...names: string[]): string => names.filter(Boolean).join('-');

interface ConstructorOptions {
  /** @example '.alerts' */
  indexPrefixFromConfig: string;
}

export class ResourceNames {
  public static joinWithDash = joinWithDash;

  constructor(private readonly options: ConstructorOptions) {}

  /** @example '.alerts' */
  public getFullPrefix(): string {
    // TODO: https://github.com/elastic/kibana/issues/106432
    return this.options.indexPrefixFromConfig;
  }

  public getFullName(...relativeNameSegments: string[]) {
    return joinWithDash(this.getFullPrefix(), ...relativeNameSegments);
  }
}
