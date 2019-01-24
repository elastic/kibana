/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMBeat } from '../../../../common/domain_types';
import { FrameworkUser } from '../framework/adapter_types';

export interface CMBeatsAdapter {
  insert(user: FrameworkUser, beat: CMBeat): Promise<void>;
  update(user: FrameworkUser, beat: CMBeat): Promise<void>;
  get(user: FrameworkUser, id: string): Promise<CMBeat | null>;
  getAll(user: FrameworkUser, ESQuery?: any): Promise<CMBeat[]>;
  getWithIds(user: FrameworkUser, beatIds: string[]): Promise<CMBeat[]>;
  getAllWithTags(user: FrameworkUser, tagIds: string[]): Promise<CMBeat[]>;
  getBeatWithToken(user: FrameworkUser, enrollmentToken: string): Promise<CMBeat | null>;
  removeTagsFromBeats(
    user: FrameworkUser,
    removals: BeatsTagAssignment[]
  ): Promise<BeatsTagAssignment[]>;
  assignTagsToBeats(
    user: FrameworkUser,
    assignments: BeatsTagAssignment[]
  ): Promise<BeatsTagAssignment[]>;
}

export interface BeatsTagAssignment {
  beatId: string;
  tag: string;
  idxInRequest?: number;
}

interface BeatsReturnedTagAssignment {
  status: number | null;
  result?: string;
}

export interface CMAssignmentReturn {
  assignments: BeatsReturnedTagAssignment[];
}

export interface BeatsRemovalReturn {
  removals: BeatsReturnedTagAssignment[];
}
