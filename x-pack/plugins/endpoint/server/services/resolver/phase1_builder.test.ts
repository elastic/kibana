/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverData } from '../../../common/types';
import { EventBuilder } from './event_builder.test';

export class Phase1Builder implements EventBuilder {
  constructor(
    public readonly originEntityID: number,
    public readonly originParentEntityID: number
  ) {}
  buildEvent(entityID: number, parentEntityID: number): ResolverData {
    return {
      event: {
        category: 'process',
        type: 'start',
      },
      endpoint: {
        process: {
          entity_id: String(entityID),
          parent: {
            entity_id: String(parentEntityID),
          },
        },
      },
    };
  }
  startingChildrenEntityID(): number {
    // can be zero because the phase 1 ids will be strings
    return 0;
  }
}
