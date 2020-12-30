/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMBeat } from '../../../../common/domain_types';
import {
  ReturnTypeBulkAction,
  ReturnTypeGet,
  ReturnTypeList,
  ReturnTypeUpdate,
} from '../../../../common/return_types';
import { RestAPIAdapter } from '../rest_api/adapter_types';
import { BeatsTagAssignment, CMBeatsAdapter } from './adapter_types';

export class RestBeatsAdapter implements CMBeatsAdapter {
  constructor(private readonly REST: RestAPIAdapter) {}

  public async get(id: string): Promise<CMBeat | null> {
    try {
      return (await this.REST.get<ReturnTypeGet<CMBeat>>(`/api/beats/agent/${id}`)).item;
    } catch (e) {
      return null;
    }
  }

  public async getBeatWithToken(enrollmentToken: string): Promise<CMBeat | null> {
    try {
      return (
        await this.REST.get<ReturnTypeGet<CMBeat>>(`/api/beats/agent/unknown/${enrollmentToken}`)
      ).item;
    } catch (e) {
      return null;
    }
  }

  public async getAll(ESQuery?: string): Promise<CMBeat[]> {
    try {
      return (await this.REST.get<ReturnTypeList<CMBeat>>('/api/beats/agents/all', { ESQuery }))
        .list;
    } catch (e) {
      return [];
    }
  }

  public async getBeatsWithTag(tagId: string): Promise<CMBeat[]> {
    try {
      return (await this.REST.get<ReturnTypeList<CMBeat>>(`/api/beats/agents/tag/${tagId}`)).list;
    } catch (e) {
      return [];
    }
  }

  public async update(id: string, beatData: Partial<CMBeat>): Promise<boolean> {
    await this.REST.put<ReturnTypeUpdate<CMBeat>>(`/api/beats/agent/${id}`, beatData);
    return true;
  }

  public async removeTagsFromBeats(
    removals: BeatsTagAssignment[]
  ): Promise<ReturnTypeBulkAction['results']> {
    return (
      await this.REST.post<ReturnTypeBulkAction>(`/api/beats/agents_tags/removals`, {
        removals,
      })
    ).results;
  }

  public async assignTagsToBeats(
    assignments: BeatsTagAssignment[]
  ): Promise<ReturnTypeBulkAction['results']> {
    return (
      await this.REST.post<ReturnTypeBulkAction>(`/api/beats/agents_tags/assignments`, {
        assignments,
      })
    ).results;
  }
}
