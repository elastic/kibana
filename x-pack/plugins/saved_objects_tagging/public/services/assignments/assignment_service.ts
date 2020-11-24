/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';
import { AssignableObject } from '../../../common/types';
import { ObjectReference } from '../../../common/assignments';

export interface ITagAssignmentService {
  findAssignableObject(options: FindAssignableObjectOptions): Promise<AssignableObject[]>;
  updateTagAssignments(options: UpdateTagAssignmentsOptions): Promise<void>;
}

export interface TagAssignmentServiceOptions {
  http: HttpSetup;
}

export interface FindAssignableObjectOptions {
  search?: string;
  maxResults?: number;
  types?: string[];
}

// TODO: move to common + use for response
export interface FindAssignableObjectResponse {
  objects: AssignableObject[];
  total: number;
}

export interface UpdateTagAssignmentsOptions {
  tags: string[];
  assign: ObjectReference[];
  unassign: ObjectReference[];
}

export class TagAssignmentService implements ITagAssignmentService {
  private readonly http: HttpSetup;

  constructor({ http }: TagAssignmentServiceOptions) {
    this.http = http;
  }

  public async findAssignableObject({ search, types, maxResults }: FindAssignableObjectOptions) {
    const { objects } = await this.http.get<FindAssignableObjectResponse>(
      '/api/saved_objects_tagging/assignments/_find_assignable_objects',
      {
        query: {
          search,
          types,
          max_results: maxResults,
        },
      }
    );
    return objects;
  }

  public async updateTagAssignments({ tags, assign, unassign }: UpdateTagAssignmentsOptions) {
    // TODO: type response
    await this.http.post<{}>('/api/saved_objects_tagging/assignments/update_by_tags', {
      body: JSON.stringify({
        tags,
        assign,
        unassign,
      }),
    });
  }
}
