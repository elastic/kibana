/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMBeat } from '../../../../common/domain_types';
import { RestAPIAdapter } from '../rest_api/adapter_types';
import {
  BeatsRemovalReturn,
  BeatsTagAssignment,
  CMAssignmentReturn,
  CMBeatsAdapter,
} from './adapter_types';
export class RestBeatsAdapter implements CMBeatsAdapter {
  constructor(private readonly REST: RestAPIAdapter) {}

  public async get(id: string): Promise<CMBeat | null> {
    return await this.REST.get<CMBeat>(`/api/beats/agent/${id}`);
  }

  public async getAll(): Promise<CMBeat[]> {
    return await this.REST.get<CMBeat[]>('/api/beats/agents');
  }

  public async removeTagsFromBeats(removals: BeatsTagAssignment[]): Promise<BeatsRemovalReturn[]> {
    return await this.REST.post<BeatsRemovalReturn[]>(`/api/beats/agents_tags/removals`, {
      removals,
    });
  }

  public async assignTagsToBeats(assignments: BeatsTagAssignment[]): Promise<CMAssignmentReturn[]> {
    return await this.REST.post<CMAssignmentReturn[]>(`/api/beats/agents_tags/assignments`, {
      assignments,
    });
  }
}
