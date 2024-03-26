/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SerializableRecord } from '@kbn/utility-types';
import rison from '@kbn/rison';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';
import { InfraLocatorDependencies } from '.';

export type HostsLocator = LocatorPublic<HostsLocatorParams>;

export type HostsLocatorDependencies = InfraLocatorDependencies;

export interface HostsLocatorParams extends SerializableRecord {
  query?: {
    language: string;
    query: string;
  };
  dateRange?: {
    from: string;
    to: string;
  };
  limit?: number;
}

export const HOSTS_LOCATOR_ID = 'HOSTS_LOCATOR';

export class HostsLocatorDefinition implements LocatorDefinition<HostsLocatorParams> {
  public readonly id = HOSTS_LOCATOR_ID;

  constructor(protected readonly deps: HostsLocatorDependencies) {}

  public readonly getLocation = async (params: HostsLocatorParams) => {
    const searchString = rison.encodeUnknown(params);
    return {
      app: 'metrics',
      path: `/hosts?_a=${searchString}`,
      state: {},
    };
  };
}
