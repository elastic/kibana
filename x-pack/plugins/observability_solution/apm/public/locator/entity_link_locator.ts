/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { SerializableRecord } from '@kbn/utility-types';

export const APM_LINK_TO_SERVICE_ENTITY_LOCATOR = 'APM_LINK_TO_SERVICE_ENTITY_LOCATOR';

export interface ApmLinkToServiceEntityLocatorParams extends SerializableRecord {
  serviceName: string;
}

export type LinkToServiceEntityLocator = LocatorPublic<ApmLinkToServiceEntityLocatorParams>;

export class LinkToServiceEntityLocatorDefinition
  implements LocatorDefinition<ApmLinkToServiceEntityLocatorParams>
{
  public readonly id = APM_LINK_TO_SERVICE_ENTITY_LOCATOR;

  public readonly getLocation = async ({ serviceName }: ApmLinkToServiceEntityLocatorParams) => {
    return {
      app: 'apm',
      path: `/link-to/entity/${encodeURIComponent(serviceName)}`,
      state: {},
    };
  };
}
