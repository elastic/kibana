/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SerializableRecord } from '@kbn/utility-types';
import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';

export const SERVICE_ENTITY_LOCATOR = 'SERVICE_ENTITY_LOCATOR';

export interface ServiceEntityLocatorParams extends SerializableRecord {
  serviceName: string;
}

export type ServiceEntityLocator = LocatorPublic<ServiceEntityLocatorParams>;

export class ServiceEntityLocatorDefinition
  implements LocatorDefinition<ServiceEntityLocatorParams>
{
  public readonly id = SERVICE_ENTITY_LOCATOR;

  public readonly getLocation = async ({ serviceName }: ServiceEntityLocatorParams) => {
    return {
      app: 'apm',
      path: `/link-to/entity/${encodeURIComponent(serviceName)}`,
      state: {},
    };
  };
}
