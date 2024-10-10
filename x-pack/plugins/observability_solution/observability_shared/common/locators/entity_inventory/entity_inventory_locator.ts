/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SerializableRecord } from '@kbn/utility-types';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';

export type EntitiesInventoryLocator = LocatorPublic<SerializableRecord>;

export const ENTITIES_INVENTORY_LOCATOR_ID = 'ENTITY_INVENTORY_LOCATOR';

export class EntitiesInventoryLocatorDefinition implements LocatorDefinition<SerializableRecord> {
  public readonly id = ENTITIES_INVENTORY_LOCATOR_ID;

  public readonly getLocation = async () => {
    return {
      app: 'observability',
      path: `/inventory`,
      state: {},
    };
  };
}
