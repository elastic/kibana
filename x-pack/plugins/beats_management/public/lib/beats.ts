/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { CMBeat, CMPopulatedBeat } from './../../common/domain_types';
import {
  BeatsRemovalReturn,
  BeatsTagAssignment,
  CMAssignmentReturn,
  CMBeatsAdapter,
} from './adapters/beats/adapter_types';
import { FrontendDomainLibs } from './types';

export class BeatsLib {
  constructor(
    private readonly adapter: CMBeatsAdapter,
    private readonly libs: { tags: FrontendDomainLibs['tags'] }
  ) {}

  /** Get a single beat using it's ID for lookup */
  public async get(id: string): Promise<CMPopulatedBeat | null> {
    const beat = await this.adapter.get(id);
    return beat ? (await this.mergeInTags([beat]))[0] : null;
  }

  /** Get a single beat using the token it was enrolled in for lookup */
  public getBeatWithToken = async (enrollmentToken: string): Promise<CMBeat | null> => {
    const beat = await this.adapter.getBeatWithToken(enrollmentToken);
    return beat;
  };

  /** Get an array of beats that have a given tag id assigned to it */
  public getBeatsWithTag = async (tagId: string): Promise<CMPopulatedBeat[]> => {
    const beats = await this.adapter.getBeatsWithTag(tagId);
    return await this.mergeInTags(beats);
  };

  // FIXME: This needs to be paginated https://github.com/elastic/kibana/issues/26022
  /** Get an array of all enrolled beats. */
  public getAll = async (ESQuery?: string): Promise<CMPopulatedBeat[]> => {
    const beats = await this.adapter.getAll(ESQuery);
    return await this.mergeInTags(beats);
  };

  /** Update a given beat via it's ID */
  public update = async (id: string, beatData: Partial<CMBeat>): Promise<boolean> => {
    return await this.adapter.update(id, beatData);
  };

  /** unassign tags from beats using an array of tags and beats */
  public removeTagsFromBeats = async (
    removals: BeatsTagAssignment[]
  ): Promise<BeatsRemovalReturn[]> => {
    return await this.adapter.removeTagsFromBeats(removals);
  };

  /** assign tags from beats using an array of tags and beats */
  public assignTagsToBeats = async (
    assignments: BeatsTagAssignment[]
  ): Promise<CMAssignmentReturn[]> => {
    return await this.adapter.assignTagsToBeats(assignments);
  };

  /** method user to join tags to beats, thus fully populating the beats */
  private mergeInTags = async (beats: CMBeat[]): Promise<CMPopulatedBeat[]> => {
    const tagIds = flatten(beats.map(b => b.tags || []));
    const tags = await this.libs.tags.getTagsWithIds(tagIds);

    // TODO the filter should not be needed, if the data gets into a bad state, we should error
    // and inform the user they need to delete the tag, or else we should auto delete it
    // https://github.com/elastic/kibana/issues/26021
    const mergedBeats: CMPopulatedBeat[] = beats.map(
      b =>
        ({
          ...b,
          full_tags: (b.tags || []).map(tagId => tags.find(t => t.id === tagId)).filter(t => t),
        } as CMPopulatedBeat)
    );
    return mergedBeats;
  };
}
