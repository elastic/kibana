/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import moment from 'moment';

import { CMBeat } from '../../../../common/domain_types';
import { FrameworkUser } from '../framework/adapter_types';
import { BeatsTagAssignment, CMBeatsAdapter } from './adapter_types';

export class MemoryBeatsAdapter implements CMBeatsAdapter {
  private beatsDB: CMBeat[];

  constructor(beatsDB: CMBeat[]) {
    this.beatsDB = beatsDB;
  }

  public async get(id: string) {
    return this.beatsDB.find(beat => beat.id === id);
  }

  public async insert(beat: CMBeat) {
    this.beatsDB.push(beat);
  }

  public async update(beat: CMBeat) {
    const beatIndex = this.beatsDB.findIndex(b => b.id === beat.id);

    this.beatsDB[beatIndex] = {
      ...this.beatsDB[beatIndex],
      ...beat,
    };
  }

  public async getWithIds(user: FrameworkUser, beatIds: string[]) {
    return this.beatsDB.filter(beat => beatIds.includes(beat.id));
  }

  public async verifyBeats(user: FrameworkUser, beatIds: string[]) {
    if (!Array.isArray(beatIds) || beatIds.length === 0) {
      return [];
    }

    const verifiedOn = moment().toJSON();

    this.beatsDB.forEach((beat, i) => {
      if (beatIds.includes(beat.id)) {
        this.beatsDB[i].verified_on = verifiedOn;
      }
    });

    return this.beatsDB.filter(beat => beatIds.includes(beat.id));
  }

  public async getAll(user: FrameworkUser) {
    return this.beatsDB.map((beat: any) => omit(beat, ['access_token']));
  }

  public async removeTagsFromBeats(
    user: FrameworkUser,
    removals: BeatsTagAssignment[]
  ): Promise<BeatsTagAssignment[]> {
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
        return beat;
      });

    return response.map<any>((item: CMBeat, resultIdx: number) => ({
      idxInRequest: removals[resultIdx].idxInRequest,
      result: 'updated',
      status: 200,
    }));
  }

  public async assignTagsToBeats(
    user: FrameworkUser,
    assignments: BeatsTagAssignment[]
  ): Promise<BeatsTagAssignment[]> {
    const beatIds = assignments.map(r => r.beatId);

    this.beatsDB.filter(beat => beatIds.includes(beat.id)).map(beat => {
      // get tags that need to be assigned to this beat
      const tags = assignments
        .filter(a => a.beatId === beat.id)
        .map((t: BeatsTagAssignment) => t.tag);

      if (tags.length > 0) {
        if (!beat.tags) {
          beat.tags = [];
        }
        const nonExistingTags = tags.filter(
          (t: string) => beat.tags && !beat.tags.includes(t)
        );

        if (nonExistingTags.length > 0) {
          beat.tags = beat.tags.concat(nonExistingTags);
        }
      }
      return beat;
    });

    return assignments.map<any>(
      (item: BeatsTagAssignment, resultIdx: number) => ({
        idxInRequest: assignments[resultIdx].idxInRequest,
        result: 'updated',
        status: 200,
      })
    );
  }
}
