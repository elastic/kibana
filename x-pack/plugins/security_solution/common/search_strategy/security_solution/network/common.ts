/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GeoEcs } from '../../../ecs/geo';
import { Maybe } from '..';

export enum NetworkTopTablesFields {
  bytes_in = 'bytes_in',
  bytes_out = 'bytes_out',
  flows = 'flows',
  destination_ips = 'destination_ips',
  source_ips = 'source_ips',
}

export interface NetworkTopTablesSortField {
  field: NetworkTopTablesFields;
  direction: Direction;
}

export enum FlowTargetSourceDest {
  destination = 'destination',
  source = 'source',
}

export enum Direction {
  asc = 'asc',
  desc = 'desc',
}

export interface GeoItem {
  geo?: Maybe<GeoEcs>;
  flowTarget?: Maybe<FlowTargetSourceDest>;
}

export interface TopNetworkTablesEcsField {
  bytes_in?: Maybe<number>;
  bytes_out?: Maybe<number>;
}
