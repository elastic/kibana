/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMBeat } from '../../../../common/domain_types';

export interface CMBeatsAdapter {
  get(id: string): Promise<CMBeat | null>;
  getAll(): Promise<CMBeat[]>;
  removeTagsFromBeats(removals: BeatsTagAssignment[]): Promise<BeatsRemovalReturn[]>;
  assignTagsToBeats(assignments: BeatsTagAssignment[]): Promise<CMAssignmentReturn[]>;
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
