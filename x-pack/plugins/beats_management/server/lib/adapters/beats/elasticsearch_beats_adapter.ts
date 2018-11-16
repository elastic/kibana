/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, get as _get, omit } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import { CMBeat } from '../../../../common/domain_types';
import { DatabaseAdapter } from '../database/adapter_types';

import { FrameworkUser } from '../framework/adapter_types';
import { BeatsTagAssignment, CMBeatsAdapter } from './adapter_types';

export class ElasticsearchBeatsAdapter implements CMBeatsAdapter {
  private database: DatabaseAdapter;

  constructor(database: DatabaseAdapter) {
    this.database = database;
  }

  public async get(user: FrameworkUser, id: string) {
    const params = {
      id: `beat:${id}`,
      ignore: [404],
      index: INDEX_NAMES.BEATS,
      type: '_doc',
    };

    const response = await this.database.get(user, params);
    if (!response.found) {
      return null;
    }

    return _get<CMBeat>(response, '_source.beat');
  }

  public async insert(user: FrameworkUser, beat: CMBeat) {
    beat.config_status = 'UNKNOWN';
    const body = {
      beat,
      type: 'beat',
    };

    await this.database.index(user, {
      body,
      id: `beat:${beat.id}`,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    });
  }

  public async update(user: FrameworkUser, beat: CMBeat) {
    const body = {
      beat,
      type: 'beat',
    };

    const params = {
      body,
      id: `beat:${beat.id}`,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    };
    await this.database.index(user, params);
  }

  public async getWithIds(user: FrameworkUser, beatIds: string[]) {
    const ids = beatIds.map(beatId => `beat:${beatId}`);

    const params = {
      _sourceIncludes: ['beat.id', 'beat.verified_on'],
      body: {
        ids,
      },
      index: INDEX_NAMES.BEATS,
      type: '_doc',
    };
    const response = await this.database.mget(user, params);

    return _get(response, 'docs', [])
      .filter((b: any) => b.found)
      .map((b: any) => b._source.beat);
  }

  public async getAllWithTags(user: FrameworkUser, tagIds: string[]): Promise<CMBeat[]> {
    const params = {
      ignore: [404],
      index: INDEX_NAMES.BEATS,
      type: '_doc',
      body: {
        query: {
          terms: { 'beat.tags': tagIds },
        },
      },
    };

    const response = await this.database.search(user, params);

    const beats = _get<CMBeat[]>(response, 'hits.hits', []);

    if (beats.length === 0) {
      return [];
    }
    return beats.map((beat: any) => omit(beat._source.beat, ['access_token']));
  }

  public async getBeatWithToken(
    user: FrameworkUser,
    enrollmentToken: string
  ): Promise<CMBeat | null> {
    const params = {
      ignore: [404],
      index: INDEX_NAMES.BEATS,
      type: '_doc',
      body: {
        query: {
          match: { 'beat.enrollment_token': enrollmentToken },
        },
      },
    };

    const response = await this.database.search(user, params);

    const beats = _get<CMBeat[]>(response, 'hits.hits', []);

    if (beats.length === 0) {
      return null;
    }
    return omit<CMBeat, {}>(_get<CMBeat>(beats[0], '_source.beat'), ['access_token']);
  }

  public async getAll(user: FrameworkUser, ESQuery?: any) {
    const params = {
      index: INDEX_NAMES.BEATS,
      size: 10000,
      type: '_doc',
      body: {
        query: {
          bool: {
            must: {
              term: {
                type: 'beat',
              },
            },
          },
        },
      },
    };

    if (ESQuery) {
      params.body.query = {
        ...params.body.query,
        ...ESQuery,
      };
    }

    let response;
    try {
      response = await this.database.search(user, params);
    } catch (e) {
      // TODO something
    }
    if (!response) {
      return [];
    }
    const beats = _get<any>(response, 'hits.hits', []);

    return beats.map((beat: any) => omit(beat._source.beat, ['access_token']));
  }

  public async removeTagsFromBeats(
    user: FrameworkUser,
    removals: BeatsTagAssignment[]
  ): Promise<BeatsTagAssignment[]> {
    const body = flatten(
      removals.map(({ beatId, tag }) => {
        const script = `
          def beat = ctx._source.beat;
          if (beat.tags != null) {
            beat.tags.removeAll([params.tag]);
          }`;

        return [
          { update: { _id: `beat:${beatId}` } },
          { script: { source: script.replace('          ', ''), params: { tag } } },
        ];
      })
    );

    const response = await this.database.bulk(user, {
      body,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    });
    return _get<any>(response, 'items', []).map((item: any, resultIdx: number) => ({
      idxInRequest: removals[resultIdx].idxInRequest,
      result: item.update.result,
      status: item.update.status,
    }));
  }

  public async assignTagsToBeats(
    user: FrameworkUser,
    assignments: BeatsTagAssignment[]
  ): Promise<BeatsTagAssignment[]> {
    const body = flatten(
      assignments.map(({ beatId, tag }) => {
        const script = `
          def beat = ctx._source.beat;
          if (beat.tags == null) {
            beat.tags = [];
          }
          if (!beat.tags.contains(params.tag)) {
            beat.tags.add(params.tag);
          }`;

        return [
          { update: { _id: `beat:${beatId}` } },
          { script: { source: script.replace('          ', ''), params: { tag } } },
        ];
      })
    );

    const response = await this.database.bulk(user, {
      body,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    });
    // console.log(response.items[0].update.error);
    return _get<any>(response, 'items', []).map((item: any, resultIdx: any) => ({
      idxInRequest: assignments[resultIdx].idxInRequest,
      result: item.update.result,
      status: item.update.status,
    }));
  }
}
