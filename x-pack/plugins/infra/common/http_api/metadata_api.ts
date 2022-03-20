/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { ItemTypeRT } from '../../common/inventory_models/types';

export const InfraMetadataRequestRT = rt.type({
  nodeId: rt.string,
  nodeType: ItemTypeRT,
  sourceId: rt.string,
  timeRange: rt.type({
    from: rt.number,
    to: rt.number,
  }),
});

export const InfraMetadataFeatureRT = rt.type({
  name: rt.string,
  source: rt.string,
});

export const InfraMetadataOSRT = rt.partial({
  codename: rt.string,
  family: rt.string,
  kernel: rt.string,
  name: rt.string,
  platform: rt.string,
  version: rt.string,
  build: rt.string,
});

export const InfraMetadataHostRT = rt.partial({
  name: rt.string,
  hostname: rt.string,
  id: rt.string,
  ip: rt.union([rt.array(rt.string), rt.string]),
  mac: rt.union([rt.array(rt.string), rt.string]),
  os: InfraMetadataOSRT,
  architecture: rt.string,
  containerized: rt.boolean,
});

export const InfraMetadataInstanceRT = rt.partial({
  id: rt.string,
  name: rt.string,
});

export const InfraMetadataAccountRT = rt.partial({
  id: rt.string,
  name: rt.string,
});

export const InfraMetadataProjectRT = rt.partial({
  id: rt.string,
});

export const InfraMetadataMachineRT = rt.partial({
  interface: rt.string,
  type: rt.string,
});

export const InfraMetadataCloudRT = rt.partial({
  instance: InfraMetadataInstanceRT,
  provider: rt.string,
  account: InfraMetadataAccountRT,
  availability_zone: rt.string,
  project: InfraMetadataProjectRT,
  machine: InfraMetadataMachineRT,
  region: rt.string,
});

export const InfraMetadataAgentRT = rt.partial({
  id: rt.string,
  version: rt.string,
  policy: rt.string,
});

export const InfraMetadataInfoRT = rt.partial({
  cloud: InfraMetadataCloudRT,
  host: InfraMetadataHostRT,
  agent: InfraMetadataAgentRT,
});

const InfraMetadataRequiredRT = rt.type({
  id: rt.string,
  name: rt.string,
  features: rt.array(InfraMetadataFeatureRT),
});

const InfraMetadataOptionalRT = rt.partial({
  info: InfraMetadataInfoRT,
});

export const InfraMetadataRT = rt.intersection([InfraMetadataRequiredRT, InfraMetadataOptionalRT]);

export type InfraMetadata = rt.TypeOf<typeof InfraMetadataRT>;

export type InfraMetadataRequest = rt.TypeOf<typeof InfraMetadataRequestRT>;

export type InfraMetadataFeature = rt.TypeOf<typeof InfraMetadataFeatureRT>;

export type InfraMetadataInfo = rt.TypeOf<typeof InfraMetadataInfoRT>;

export type InfraMetadataCloud = rt.TypeOf<typeof InfraMetadataCloudRT>;

export type InfraMetadataInstance = rt.TypeOf<typeof InfraMetadataInstanceRT>;

export type InfraMetadataProject = rt.TypeOf<typeof InfraMetadataProjectRT>;

export type InfraMetadataMachine = rt.TypeOf<typeof InfraMetadataMachineRT>;

export type InfraMetadataHost = rt.TypeOf<typeof InfraMetadataHostRT>;

export type InfraMetadataOS = rt.TypeOf<typeof InfraMetadataOSRT>;
