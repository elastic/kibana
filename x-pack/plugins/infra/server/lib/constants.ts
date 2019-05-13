/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNodeType } from '../graphql/types';

// Used for metadata and snapshots resolvers to find the field that contains
// a displayable name of a node.
// Intentionally not the same as xpack.infra.sources.default.fields.{host,container,pod}.
// TODO: consider moving this to source configuration too.
export const NAME_FIELDS = {
  [InfraNodeType.host]: 'host.name',
  [InfraNodeType.pod]: 'kubernetes.pod.name',
  [InfraNodeType.container]: 'container.name',
};
export const IP_FIELDS = {
  [InfraNodeType.host]: 'host.ip',
  [InfraNodeType.pod]: 'kubernetes.pod.ip',
  [InfraNodeType.container]: 'container.ip_address',
};
