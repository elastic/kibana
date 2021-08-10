/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Dataset } from './index_options';
import { ResourceNames } from './resource_names';

const joinWithDash = ResourceNames.joinWithDash;

interface ConstructorOptions {
  resourceNames: ResourceNames;

  /** @example 'security', 'observability', 'observability.logs' */
  registrationContext: string;

  /** @example 'alerts', 'events' */
  dataset: Dataset;

  /** @example '.siem-signals', null */
  secondaryAlias: string | null;
}

export class IndexNames {
  constructor(private readonly options: ConstructorOptions) {
    const { resourceNames, registrationContext, dataset } = options;

    this.prefix = resourceNames.getFullPrefix();
    this.baseName = resourceNames.getFullName(registrationContext, dataset);
    this.basePattern = joinWithDash(this.baseName, '*');
  }

  /** @example '.alerts' */
  public readonly prefix: string;

  /** @example '.alerts-security.alerts' */
  public readonly baseName: string;

  /** @example '.alerts-security.alerts-*' */
  public readonly basePattern: string;

  /** @example '.alerts-security.alerts-default' */
  public getPrimaryAlias(namespace: string): string {
    return joinWithDash(this.baseName, namespace);
  }

  /** @example '.alerts-security.alerts-default-*' */
  public getPrimaryAliasPattern(namespace: string): string {
    return joinWithDash(this.baseName, namespace, '*');
  }

  /** @example '.siem-signals-default', null */
  public getSecondaryAlias(namespace: string): string | null {
    const { secondaryAlias } = this.options;
    return secondaryAlias ? joinWithDash(secondaryAlias, namespace) : null;
  }

  /** @example '.alerts-security.alerts-default-000001' */
  public getConcreteIndexInitialName(namespace: string): string {
    return joinWithDash(this.baseName, namespace, '000001');
  }

  /** @example '.alerts-security.alerts-policy' */
  public getIlmPolicyName(): string {
    return joinWithDash(this.baseName, 'policy');
  }

  /** @example '.alerts-security.alerts-mappings' */
  public getComponentTemplateName(relativeName: string): string {
    return joinWithDash(this.baseName, relativeName);
  }

  /** @example '.alerts-security.alerts-default-index-template' */
  public getIndexTemplateName(namespace: string): string {
    return joinWithDash(this.baseName, namespace, 'index-template');
  }
}
