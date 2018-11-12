/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Container } from 'unstated';
import { CMPopulatedBeat } from './../../common/domain_types';
import { BeatsTagAssignment } from './../../server/lib/adapters/beats/adapter_types';
import { FrontendLibs } from './../lib/types';

interface ContainerState {
  list: CMPopulatedBeat[];
}

export class BeatsContainer extends Container<ContainerState> {
  constructor(private readonly libs: FrontendLibs) {
    super();
    this.state = {
      list: [],
    };
  }
  public reload = async (kuery?: string) => {
    let query;
    if (kuery) {
      query = await this.libs.elasticsearch.convertKueryToEsQuery(kuery);
    }
    const beats = await this.libs.beats.getAll(query);

    this.setState({
      list: beats,
    });
  };

  public deactivate = async (beats: CMPopulatedBeat[]) => {
    for (const beat of beats) {
      await this.libs.beats.update(beat.id, { active: false });
    }

    // because the compile code above has a very minor race condition, we wait,
    // the max race condition time is really 10ms but doing 100 to be safe
    setTimeout(async () => {
      await this.reload();
    }, 100);
  };

  public toggleTagAssignment = async (tagId: string, beats: CMPopulatedBeat[]) => {
    if (beats.some(beat => beat.full_tags.some(({ id }) => id === tagId))) {
      await this.removeTagsFromBeats(beats, tagId);
    } else {
      await this.assignTagsToBeats(beats, tagId);
    }
  };

  public removeTagsFromBeats = async (beats: CMPopulatedBeat[], tagId: string) => {
    if (beats.length) {
      const assignments = createBeatTagAssignments(beats, tagId);
      await this.libs.beats.removeTagsFromBeats(assignments);
      await this.reload();
    }
  };

  public assignTagsToBeats = async (beats: CMPopulatedBeat[], tagId: string) => {
    if (beats.length) {
      const assignments = createBeatTagAssignments(beats, tagId);
      await this.libs.beats.assignTagsToBeats(assignments);
      await this.reload();
    }
  };
}

function createBeatTagAssignments(beats: CMPopulatedBeat[], tagId: string): BeatsTagAssignment[] {
  return beats.map(({ id }) => ({ beatId: id, tag: tagId }));
}
