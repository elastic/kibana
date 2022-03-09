/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INDEX_PREFIX } from '../config';
import { IndexOptions } from './index_options';
import { joinWithDash } from './utils';

interface ConstructorOptions {
  indexOptions: IndexOptions;
  kibanaVersion: string;
}

/**
 * Internal info used by the index bootstrapping logic, reader and writer.
 * Should not be exposed to clients of the library.
 *
 * Names returned by methods of this class should be used in Elasticsearch APIs.
 */
export class IndexInfo {
  constructor(options: ConstructorOptions) {
    const { indexOptions, kibanaVersion } = options;
    const { registrationContext, dataset, additionalPrefix } = indexOptions;

    this.indexOptions = indexOptions;
    this.kibanaVersion = kibanaVersion;
    this.baseName = joinWithDash(
      `${additionalPrefix ?? ''}${INDEX_PREFIX}`,
      `${registrationContext}.${dataset}`
    );
    this.basePattern = joinWithDash(this.baseName, '*');
    this.baseNameForBackingIndices = `.internal${this.baseName}`;
  }

  /**
   * Options provided by the plugin/solution defining the index.
   */
  public readonly indexOptions: IndexOptions;

  /**
   * Current version of Kibana. We version our index resources and documents based on it.
   * @example '7.16.0'
   */
  public readonly kibanaVersion: string;

  /**
   * Base index name, prefixed with the resource prefix.
   * @example '.alerts-security.alerts'
   */
  public readonly baseName: string;

  /**
   * Base index pattern. Includes all namespaces of this index.
   * @example '.alerts-security.alerts-*'
   */
  public readonly basePattern: string;

  /**
   * Base name for internal backing indices, prefixed with a special prefix.
   * @example '.internal.alerts-security.alerts'
   */
  private readonly baseNameForBackingIndices: string;

  /**
   * Primary index alias. Includes a namespace.
   * Used as a write target when writing documents to the index.
   * @example '.alerts-security.alerts-default'
   */
  public getPrimaryAlias(namespace: string): string {
    return joinWithDash(this.baseName, namespace);
  }

  /**
   * Optional secondary alias that can be applied to concrete indices in
   * addition to the primary one.
   * @example '.siem-signals-default', null
   */
  public getSecondaryAlias(namespace: string): string | null {
    const { secondaryAlias } = this.indexOptions;
    return secondaryAlias ? joinWithDash(secondaryAlias, namespace) : null;
  }

  /**
   * Name of the initial concrete index, with the namespace and the ILM suffix.
   * @example '.internal.alerts-security.alerts-default-000001'
   */
  public getConcreteIndexInitialName(namespace: string): string {
    return joinWithDash(this.baseNameForBackingIndices, namespace, '000001');
  }

  /**
   * Index pattern for internal backing indices. Used in the index bootstrapping logic.
   * Can include or exclude the namespace.
   *
   * WARNING: Must not be used for reading documents! If you use it, you should know what you're doing.
   *
   * @example '.internal.alerts-security.alerts-default-*', '.internal.alerts-security.alerts-*'
   */
  public getPatternForBackingIndices(namespace?: string): string {
    return joinWithDash(this.baseNameForBackingIndices, namespace, '*');
  }

  /**
   * Index pattern that should be used when reading documents from the index.
   * Can include or exclude the namespace.
   *
   * IMPORTANT: The namespace is user-defined in general. Because of that, when
   * reading data from the index, we want to do this by default:
   *   - pass namespace = undefined
   *   - search over all the namespaces
   *   - include nested registration contexts eagerly
   *   - e.g. if baseName='.alerts-observability', include '.alerts-observability.apm'
   *
   * @example '.alerts-security.alerts-default*', '.alerts-security.alerts*'
   */
  public getPatternForReading(namespace?: string): string {
    return `${joinWithDash(this.baseName, namespace)}*`;
  }

  /**
   * Name of the custom ILM policy (if it's provided by the plugin/solution).
   * Specific to the index. Shared between all namespaces of the index.
   * @example '.alerts-security.alerts-policy'
   */
  public getIlmPolicyName(): string {
    return joinWithDash(this.baseName, 'policy');
  }

  /**
   * Full name of a component template.
   * @example '.alerts-security.alerts-mappings'
   */
  public getComponentTemplateName(relativeName: string): string {
    return joinWithDash(this.baseName, relativeName);
  }

  /**
   * Full name of the index template. Each namespace gets its own template.
   * @example '.alerts-security.alerts-default-index-template'
   */
  public getIndexTemplateName(namespace: string): string {
    return joinWithDash(this.baseName, namespace, 'index-template');
  }
}
