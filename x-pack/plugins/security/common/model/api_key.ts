/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

// Fixing up types here since some fields are marked as optional in `estypes` even though they are guaranteed to be present
type ApiKeyFieldsThatAreWronglyTypedAsOptional =
  | 'username'
  | 'realm'
  | 'creation'
  | 'metadata'
  | 'role_descriptors';
type BaseApiKey = Pick<
  Required<estypes.SecurityApiKey>,
  ApiKeyFieldsThatAreWronglyTypedAsOptional
> &
  Omit<estypes.SecurityApiKey, ApiKeyFieldsThatAreWronglyTypedAsOptional>;

/**
 * Interface representing a REST API key the way it is returned by Elasticsearch GET endpoint.
 */
export interface RestApiKey extends BaseApiKey {
  type: 'rest';
}

/**
 * Interface representing a Cross-Cluster API key the way it is returned by Elasticsearch GET endpoint.
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
 * Interface representing an API key the way it is returned by Elasticsearch GET endpoint.
 */
export type ApiKey = RestApiKey | CrossClusterApiKey;

export type ApiKeyRoleDescriptors = Record<string, estypes.SecurityRoleDescriptor>;

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

type CrossClusterApiKeySearch = Pick<
  estypes.SecurityIndicesPrivileges,
  'names' | 'field_security' | 'query' | 'allow_restricted_indices'
>;

type CrossClusterApiKeyReplication = Pick<estypes.SecurityIndicesPrivileges, 'names'>;

export interface ApiKeyToInvalidate {
  id: string;
  name: string;
}
