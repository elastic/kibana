/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dataset } from './options';

const joinWithDash = (...names: string[]): string => names.filter(Boolean).join('-');

export interface IndexNamesOptions {
  /** @example '.alerts' */
  indexPrefix: string;

  /** @example 'security', 'observability', 'observability.logs' */
  registrationContext: string;

  /** @example 'alerts', 'events' */
  dataset: Dataset;
}

export class IndexNames {
  public static joinWithDash = joinWithDash;

  /** @example '.alerts-security-alerts' */
  private readonly baseName: string;

  constructor(private readonly options: IndexNamesOptions) {
    const { indexPrefix, registrationContext, dataset } = options;
    this.baseName = joinWithDash(indexPrefix, registrationContext, dataset);
  }

  public getPrefixedName(...relativeNames: string[]): string {
    const { indexPrefix } = this.options;
    return joinWithDash(indexPrefix, ...relativeNames);
  }

  public getFullAssetName(...relativeNames: string[]): string {
    return joinWithDash(this.baseName, ...relativeNames);
  }

  /** @example '.alerts-security-alerts' */
  public get indexBaseName(): string {
    return this.baseName;
  }

  /** @example '.alerts-security.alerts-*' */
  public get indexBasePattern(): string {
    return joinWithDash(this.baseName, '*');
  }

  /** @example '.alerts-security.alerts-default' */
  public getIndexAliasName(namespace: string): string {
    return joinWithDash(this.baseName, namespace);
  }

  /** @example '.alerts-security.alerts-default-*' */
  public getIndexAliasPattern(namespace: string): string {
    return joinWithDash(this.baseName, namespace, '*');
  }

  /** @example '.alerts-security.alerts-default-000001' */
  public getIndexInitialName(namespace: string): string {
    return joinWithDash(this.baseName, namespace, '000001');
  }

  /** @example '.alerts-security.alerts-policy' */
  public get ilmPolicyName(): string {
    return joinWithDash(this.baseName, 'policy');
  }

  /** @example '.alerts-security.alerts-default-index-template' */
  public getIndexTemplateName(namespace: string): string {
    return joinWithDash(this.baseName, namespace, 'index-template');
  }
}
