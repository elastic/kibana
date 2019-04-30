/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { CMBeat } from '../../../../common/domain_types';
import { ReturnTypeBulkAction } from '../../../../common/return_types';
import { BeatsTagAssignment, CMBeatsAdapter } from './adapter_types';

export class MemoryBeatsAdapter implements CMBeatsAdapter {
  private beatsDB: CMBeat[];

  constructor(beatsDB: CMBeat[]) {
    this.beatsDB = beatsDB;
  }

  public async get(id: string) {
    return this.beatsDB.find(beat => beat.id === id) || null;
  }

  public async update(id: string, beatData: Partial<CMBeat>): Promise<boolean> {
    const index = this.beatsDB.findIndex(beat => beat.id === id);

    if (index === -1) {
      return false;
    }

    this.beatsDB[index] = { ...this.beatsDB[index], ...beatData };
    return true;
  }

  public async getAll() {
    return this.beatsDB.map<CMBeat>((beat: any) => omit(beat, ['access_token']));
  }
  public async getBeatsWithTag(tagId: string): Promise<CMBeat[]> {
    return this.beatsDB.map<CMBeat>((beat: any) => omit(beat, ['access_token']));
  }

  public async getBeatWithToken(enrollmentToken: string): Promise<CMBeat | null> {
    return this.beatsDB.map<CMBeat>((beat: any) => omit(beat, ['access_token']))[0];
  }
  public async removeTagsFromBeats(
    removals: BeatsTagAssignment[]
  ): Promise<ReturnTypeBulkAction['results']> {
    const beatIds = removals.map(r => r.beatId);

    const response = this.beatsDB
      .filter(beat => beatIds.includes(beat.id))
      .map(beat => {
        const tagData = removals.find(r => r.beatId === beat.id);
        if (tagData) {
          if (beat.tags) {
            beat.tags = beat.tags.filter(tag => tag !== tagData.tag);
          }
        }
        const removalsForBeat = removals.filter(r => r.beatId === beat.id);
        if (removalsForBeat.length) {
          removalsForBeat.forEach((assignment: BeatsTagAssignment) => {
            if (beat.tags) {
              beat.tags = beat.tags.filter(tag => tag !== assignment.tag);
            }
          });
        }
        return beat;
      });

    return response.map<any>((item: CMBeat, resultIdx: number) => ({
      idxInRequest: removals[resultIdx].idxInRequest,
      result: 'updated',
      status: 200,
    }));
  }

  public async assignTagsToBeats(
    assignments: BeatsTagAssignment[]
  ): Promise<ReturnTypeBulkAction['results']> {
    const beatIds = assignments.map(r => r.beatId);

    this.beatsDB
      .filter(beat => beatIds.includes(beat.id))
      .map(beat => {
        // get tags that need to be assigned to this beat
        const tags = assignments
          .filter(a => a.beatId === beat.id)
          .map((t: BeatsTagAssignment) => t.tag);

        if (tags.length > 0) {
          if (!beat.tags) {
            beat.tags = [];
          }
          const nonExistingTags = tags.filter((t: string) => beat.tags && !beat.tags.includes(t));

          if (nonExistingTags.length > 0) {
            beat.tags = beat.tags.concat(nonExistingTags);
          }
        }
        return beat;
      });

    return assignments.map<any>((item: BeatsTagAssignment, resultIdx: number) => ({
      idxInRequest: assignments[resultIdx].idxInRequest,
      result: 'updated',
      status: 200,
    }));
  }
}
