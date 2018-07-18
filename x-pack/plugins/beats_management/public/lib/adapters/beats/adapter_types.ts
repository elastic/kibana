/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMBeat } from '../../../../common/domain_types';

export interface CMBeatsAdapter {
  insert(beat: CMBeat): Promise<void>;
  update(beat: CMBeat): Promise<void>;
  get(id: string): Promise<CMBeat>;
  getAll(): Promise<CMBeat[]>;
  getWithIds(beatIds: string[]): Promise<CMBeat[]>;
  removeTagsFromBeats(removals: BeatsTagAssignment[]): Promise<BeatsTagAssignment[]>;
  assignTagsToBeats(assignments: BeatsTagAssignment[]): Promise<BeatsTagAssignment[]>;
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
