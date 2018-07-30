/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMBeat } from '../../../../common/domain_types';
import { RestAPIAdapter } from '../rest_api/adapter_types';
import { BeatsTagAssignment, CMBeatsAdapter } from './adapter_types';
export class RestBeatsAdapter implements CMBeatsAdapter {
  constructor(private readonly REST: RestAPIAdapter) {}

  public async get(id: string): Promise<CMBeat | null> {
    // TODO need endpoint update
    // return this.REST.get('/api/beats/agents');
    return null;
  }

  public async getWithIds(beatIds: string[]): Promise<CMBeat[]> {
    // TODO need endpoint update
    return [];
  }

  public async getAll(): Promise<CMBeat[]> {
    return await this.REST.get<CMBeat[]>('/api/beats/agents');
  }

  public async removeTagsFromBeats(removals: BeatsTagAssignment[]): Promise<BeatsTagAssignment[]> {
    // TODO need endpoint update

    return [];
  }

  public async assignTagsToBeats(assignments: BeatsTagAssignment[]): Promise<BeatsTagAssignment[]> {
    // TODO need endpoint update

    return [];
  }
}
