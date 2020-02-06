/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverData } from '../../../common/types';
import { EventBuilder } from './event_builder.test';

export class Phase0Builder implements EventBuilder {
  constructor(
    public readonly endpointID: string,
    public readonly originEntityID: number,
    public readonly originParentEntityID: number
  ) {}
  buildEvent(entityID: number, parentEntityID: number): ResolverData {
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
  startingChildrenEntityID(): number {
    return this.originEntityID + 1;
  }
}
