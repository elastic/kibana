/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'src/core/public';
import { AssignableObject } from '../../../common/types';

export interface ITagAssignmentService {
  findAssignableObject(options: FindAssignableObjectOptions): Promise<AssignableObject[]>;
}

export interface TagAssignmentServiceOptions {
  http: HttpSetup;
}

export interface FindAssignableObjectOptions {
  search?: string;
  maxResults?: number;
  types?: string[];
}

export interface FindAssignableObjectResponse {
  objects: AssignableObject[];
  total: number;
}

export class TagAssignmentService implements ITagAssignmentService {
  private readonly http: HttpSetup;

  constructor({ http }: TagAssignmentServiceOptions) {
    this.http = http;
  }

  public async findAssignableObject({ search, types, maxResults }: FindAssignableObjectOptions) {
    const { objects } = await this.http.get<FindAssignableObjectResponse>(
      '/internal/saved_objects_tagging/_find_assignable_objects',
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
}
