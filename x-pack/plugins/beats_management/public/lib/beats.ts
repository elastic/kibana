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
import { FrontendDomainLibs } from './lib';

export class BeatsLib {
  constructor(
    private readonly adapter: CMBeatsAdapter,
    private readonly libs: { tags: FrontendDomainLibs['tags'] }
  ) {}

  public async get(id: string): Promise<CMPopulatedBeat | null> {
    const beat = await this.adapter.get(id);
    return beat ? (await this.mergeInTags([beat]))[0] : null;
  }

  public async getBeatWithToken(enrollmentToken: string): Promise<CMBeat | null> {
    const beat = await this.adapter.getBeatWithToken(enrollmentToken);
    return beat;
  }

  public async getBeatsWithTag(tagId: string): Promise<CMPopulatedBeat[]> {
    const beats = await this.adapter.getBeatsWithTag(tagId);
    return await this.mergeInTags(beats);
  }

  public async getAll(ESQuery?: any): Promise<CMPopulatedBeat[]> {
    const beats = await this.adapter.getAll(ESQuery);
    return await this.mergeInTags(beats);
  }

  public async update(id: string, beatData: Partial<CMBeat>): Promise<boolean> {
    return await this.adapter.update(id, beatData);
  }

  public async removeTagsFromBeats(removals: BeatsTagAssignment[]): Promise<BeatsRemovalReturn[]> {
    return await this.adapter.removeTagsFromBeats(removals);
  }

  public async assignTagsToBeats(assignments: BeatsTagAssignment[]): Promise<CMAssignmentReturn[]> {
    return await this.adapter.assignTagsToBeats(assignments);
  }

  private async mergeInTags(beats: CMBeat[]): Promise<CMPopulatedBeat[]> {
    const tagIds = flatten(beats.map(b => b.tags || []));
    const tags = await this.libs.tags.getTagsWithIds(tagIds);

    // TODO the filter should not be needed, if the data gets into a bad state, we should error
    // and inform the user they need to delte the tag, or else we should auto delete it
    const mergedBeats: CMPopulatedBeat[] = beats.map(
      b =>
        ({
          ...b,
          full_tags: (b.tags || []).map(tagId => tags.find(t => t.id === tagId)).filter(t => t),
        } as CMPopulatedBeat)
    );
    return mergedBeats;
  }
}
