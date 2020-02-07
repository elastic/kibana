/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverData } from '../../../common/types';
import { EventBuilder } from './event_builder.test';

export class ElasticEndpointBuilder implements EventBuilder {
  private childCounter: number = 0;
  constructor(
    private readonly originEntityID: string,
    private readonly originParentEntityID: string
  ) {}

  createEvent(entityID: string, parentEntityID: string) {
    return {
      event: {
        category: 'process',
        type: 'start',
      },
      endpoint: {
        process: {
          entity_id: entityID,
          parent: {
            entity_id: parentEntityID,
          },
        },
      },
    };
  }

  buildChildEvent(): ResolverData {
    const entityID = this.originEntityID + String(this.childCounter);
    return this.createEvent(entityID, this.originEntityID);
  }

  startNewChildNode() {
    this.childCounter += 1;
  }

  buildOriginEvent(): ResolverData {
    return this.createEvent(this.originEntityID, this.originParentEntityID);
  }
}
