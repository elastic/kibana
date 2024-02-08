/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

/**
 * Interface representing an API key the way it is returned by Elasticsearch GET endpoint.
 */
export type ApiKey = RestApiKey | CrossClusterApiKey;

/**
 * Interface representing a REST API key the way it is returned by Elasticsearch GET endpoint.
 *
 * TODO: Remove this type when `@elastic/elasticsearch` has been updated.
 */
export interface RestApiKey extends BaseApiKey {
  type: 'rest';
}

/**
 * Interface representing a cross-cluster API key the way it is returned by Elasticsearch GET endpoint.
 *
 * TODO: Remove this type when `@elastic/elasticsearch` has been updated.
 */
export interface CrossClusterApiKey extends BaseApiKey {
  type: 'cross_cluster';

  /**
   * The access to be granted to this API key. The access is composed of permissions for cross-cluster
   * search and cross-cluster replication. At least one of them must be specified.
   */
  access: CrossClusterApiKeyAccess;
}

/**
 * Fixing up `estypes.SecurityApiKey` type since some fields are marked as optional even though they are guaranteed to be returned.
 *
 * TODO: Remove this type when `@elastic/elasticsearch` has been updated.
 */
interface BaseApiKey extends estypes.SecurityApiKey {
  username: Required<estypes.SecurityApiKey>['username'];
  realm: Required<estypes.SecurityApiKey>['realm'];
  creation: Required<estypes.SecurityApiKey>['creation'];
  metadata: Required<estypes.SecurityApiKey>['metadata'];
  role_descriptors: Required<estypes.SecurityApiKey>['role_descriptors'];
}

// TODO: Remove this type when `@elastic/elasticsearch` has been updated.
export interface CrossClusterApiKeyAccess {
  /**
   * A list of indices permission entries for cross-cluster search.
   */
  search?: CrossClusterApiKeySearch[];

  /**
   * A list of indices permission entries for cross-cluster replication.
   */
  replication?: CrossClusterApiKeyReplication[];
}

// TODO: Remove this type when `@elastic/elasticsearch` has been updated.
type CrossClusterApiKeySearch = Pick<
  estypes.SecurityIndicesPrivileges,
  'names' | 'field_security' | 'query' | 'allow_restricted_indices'
>;

// TODO: Remove this type when `@elastic/elasticsearch` has been updated.
type CrossClusterApiKeyReplication = Pick<estypes.SecurityIndicesPrivileges, 'names'>;

export type ApiKeyRoleDescriptors = Record<string, estypes.SecurityRoleDescriptor>;

export interface ApiKeyToInvalidate {
  id: string;
  name: string;
}
