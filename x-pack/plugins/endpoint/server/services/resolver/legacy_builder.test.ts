/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverData } from '../../../common/types';
import { EventBuilder } from './event_builder.test';

export class LegacyBuilder implements EventBuilder {
  private childEntityID: number;

  constructor(
    private readonly endpointID: string,
    private readonly originEntityID: number,
    private readonly originParentEntityID: number
  ) {
    this.childEntityID = this.originEntityID + 1;
  }

  private createEvent(entityID: number, parentEntityID: number) {
    return {
      endgame: {
        event_type_full: 'process_event',
        event_subtype_full: 'creation_event',
        unique_pid: entityID,
        unique_ppid: parentEntityID,
      },
      agent: {
        id: this.endpointID,
      },
    };
  }

  buildChildEvent(): ResolverData {
    const entityID = this.childEntityID;
    return this.createEvent(entityID, this.originEntityID);
  }

  startNewChildNode() {
    this.childEntityID += 1;
  }

  buildOriginEvent(): ResolverData {
    return this.createEvent(this.originEntityID, this.originParentEntityID);
  }
}
