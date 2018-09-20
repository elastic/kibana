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

  public async getBeatWithToken(enrollmentToken: string): Promise<CMBeat | null> {
    const beat = await this.REST.get<CMBeat>(`/api/beats/agent/unknown/${enrollmentToken}`);
    return beat;
  }

  public async getAll(ESQuery?: any): Promise<CMBeat[]> {
    return (await this.REST.get<{ beats: CMBeat[] }>('/api/beats/agents/all', { ESQuery })).beats;
  }

  public async getBeatsWithTag(tagId: string): Promise<CMBeat[]> {
    return (await this.REST.get<{ beats: CMBeat[] }>(`/api/beats/agents/tag/${tagId}`)).beats;
  }

  public async update(id: string, beatData: Partial<CMBeat>): Promise<boolean> {
    await this.REST.put<{ success: true }>(`/api/beats/agent/${id}`, beatData);
    return true;
  }

  public async removeTagsFromBeats(removals: BeatsTagAssignment[]): Promise<BeatsRemovalReturn[]> {
    return (await this.REST.post<{ removals: BeatsRemovalReturn[] }>(
      `/api/beats/agents_tags/removals`,
      {
        removals,
      }
    )).removals;
  }

  public async assignTagsToBeats(assignments: BeatsTagAssignment[]): Promise<CMAssignmentReturn[]> {
    return (await this.REST.post<{ assignments: CMAssignmentReturn[] }>(
      `/api/beats/agents_tags/assignments`,
      {
        assignments,
      }
    )).assignments;
  }
}
