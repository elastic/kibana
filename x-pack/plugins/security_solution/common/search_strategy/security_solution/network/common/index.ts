/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GeoEcs } from '../../../../ecs/geo';
import { Maybe } from '../../..';

export enum NetworkDirectionEcs {
  inbound = 'inbound',
  outbound = 'outbound',
  internal = 'internal',
  external = 'external',
  incoming = 'incoming',
  outgoing = 'outgoing',
  listening = 'listening',
  unknown = 'unknown',
}

export enum NetworkTopTablesFields {
  bytes_in = 'bytes_in',
  bytes_out = 'bytes_out',
  flows = 'flows',
  destination_ips = 'destination_ips',
  source_ips = 'source_ips',
}

export enum FlowTarget {
  client = 'client',
  destination = 'destination',
  server = 'server',
  source = 'source',
}

export enum FlowTargetSourceDest {
  destination = 'destination',
  source = 'source',
}

export interface TopNetworkTablesEcsField {
  bytes_in?: Maybe<number>;
  bytes_out?: Maybe<number>;
}

export interface GeoItem {
  geo?: Maybe<GeoEcs>;
  flowTarget?: Maybe<FlowTargetSourceDest>;
}
