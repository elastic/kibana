/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMBeat } from '../../../../common/domain_types';
import { FrameworkRequest } from '../famework/adapter_types';

// FIXME: fix getBeatsWithIds return type
export interface CMBeatsAdapter {
  insert(beat: CMBeat): Promise<void>;
  update(beat: CMBeat): Promise<void>;
  get(id: string): any;
  getAll(req: FrameworkRequest): any;
  getWithIds(req: FrameworkRequest, beatIds: string[]): any;
  verifyBeats(req: FrameworkRequest, beatIds: string[]): any;
  removeTagsFromBeats(
    req: FrameworkRequest,
    removals: BeatsTagAssignment[]
  ): Promise<BeatsTagAssignment[]>;
  assignTagsToBeats(
    req: FrameworkRequest,
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
