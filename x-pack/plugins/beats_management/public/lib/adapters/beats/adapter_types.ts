/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMBeat } from '../../../../../../legacy/plugins/beats_management/common/domain_types';
import { ReturnTypeBulkAction } from '../../../../../../legacy/plugins/beats_management/common/return_types';

export interface CMBeatsAdapter {
  get(id: string): Promise<CMBeat | null>;
  update(id: string, beatData: Partial<CMBeat>): Promise<boolean>;
  getBeatsWithTag(tagId: string): Promise<CMBeat[]>;
  getAll(ESQuery?: any): Promise<CMBeat[]>;
  removeTagsFromBeats(removals: BeatsTagAssignment[]): Promise<ReturnTypeBulkAction['results']>;
  assignTagsToBeats(assignments: BeatsTagAssignment[]): Promise<ReturnTypeBulkAction['results']>;
  getBeatWithToken(enrollmentToken: string): Promise<CMBeat | null>;
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
