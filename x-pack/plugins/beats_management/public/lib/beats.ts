/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ReturnTypeBulkAction } from '../../../../legacy/plugins/beats_management/common/return_types';
import { CMBeat } from '../../../../legacy/plugins/beats_management/common/domain_types';
import { BeatsTagAssignment, CMBeatsAdapter } from './adapters/beats/adapter_types';
import { ElasticsearchLib } from './elasticsearch';

export class BeatsLib {
  constructor(
    private readonly adapter: CMBeatsAdapter,
    private readonly elasticsearch: ElasticsearchLib
  ) {}

  /** Get a single beat using it's ID for lookup */
  public async get(id: string): Promise<CMBeat | null> {
    const beat = await this.adapter.get(id);
    return beat;
  }

  /** Get a single beat using the token it was enrolled in for lookup */
  public getBeatWithToken = async (enrollmentToken: string): Promise<CMBeat | null> => {
    const beat = await this.adapter.getBeatWithToken(enrollmentToken);
    return beat;
  };

  /** Get an array of beats that have a given tag id assigned to it */
  public getBeatsWithTag = async (tagId: string): Promise<CMBeat[]> => {
    const beats = await this.adapter.getBeatsWithTag(tagId);
    return beats;
  };

  // FIXME: This needs to be paginated https://github.com/elastic/kibana/issues/26022
  /** Get an array of all enrolled beats. */
  public getAll = async (kuery?: string): Promise<CMBeat[]> => {
    let ESQuery;
    if (kuery) {
      ESQuery = await this.elasticsearch.convertKueryToEsQuery(kuery);
    }
    const beats = await this.adapter.getAll(ESQuery);
    return beats;
  };

  /** Update a given beat via it's ID */
  public update = async (id: string, beatData: Partial<CMBeat>): Promise<boolean> => {
    return await this.adapter.update(id, beatData);
  };

  /** unassign tags from beats using an array of tags and beats */
  public removeTagsFromBeats = async (
    removals: BeatsTagAssignment[]
  ): Promise<ReturnTypeBulkAction['results']> => {
    return await this.adapter.removeTagsFromBeats(removals);
  };

  /** assign tags from beats using an array of tags and beats */
  public assignTagsToBeats = async (
    assignments: BeatsTagAssignment[]
  ): Promise<ReturnTypeBulkAction['results']> => {
    return await this.adapter.assignTagsToBeats(assignments);
  };
}
