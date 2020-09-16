/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RecursiveReadonly } from '@kbn/utility-types';
import { FeatureElasticsearchPrivileges } from './feature_elasticsearch_privileges';

/**
 * Interface for registering an Elasticsearch feature.
 * Feature registration allows plugins to hide their applications based
 * on configured cluster or index privileges.
 */
export interface ElasticsearchFeatureConfig {
  /**
   * Unique identifier for this feature.
   * This identifier is also used when generating UI Capabilities.
   *
   * @see UICapabilities
   */
  id: string;

  /**
   * Management sections associated with this feature.
   *
   * @example
   * ```ts
   *  // Enables access to the "Advanced Settings" management page within the Kibana section
   *  management: {
   *    kibana: ['settings']
   *  }
   * ```
   */
  management?: {
    [sectionId: string]: string[];
  };

  /**
   * If this feature includes a catalogue entry, you can specify them here to control visibility based on the current space.
   *
   */
  catalogue?: string[];

  /**
   * Feature privilege definition. Specify one or more privileges which grant access to this feature.
   * Users must satisfy all privileges in at least one of the defined sets of privileges in order to be granted access.
   *
   * @example
   * ```ts
   *  [{
   *     requiredClusterPrivileges: ['monitor'],
   *     requiredIndexPrivileges: {
   *        ['metricbeat-*']: ['read', 'view_index_metadata']
   *     }
   *  }]
   * ```
   * @see FeatureElasticsearchPrivileges
   */
  privileges: FeatureElasticsearchPrivileges[];
}

export class ElasticsearchFeature {
  constructor(protected readonly config: RecursiveReadonly<ElasticsearchFeatureConfig>) {}

  public get id() {
    return this.config.id;
  }

  public get catalogue() {
    return this.config.catalogue;
  }

  public get management() {
    return this.config.management;
  }

  public get privileges() {
    return this.config.privileges;
  }

  public toRaw() {
    return { ...this.config } as ElasticsearchFeatureConfig;
  }
}
