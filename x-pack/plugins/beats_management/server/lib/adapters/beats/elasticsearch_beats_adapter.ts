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
    };

    const response = await this.database.get(user, params);
    if (!response.found) {
      return null;
    }
    const beat = _get<CMBeat>(response, '_source.beat');
    beat.tags = beat.tags || [];
    return beat;
  }

  public async insert(user: FrameworkUser, beat: CMBeat) {
    const body = {
      beat,
      type: 'beat',
    };

    await this.database.index(user, {
      body,
      id: `beat:${beat.id}`,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
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
    };
    await this.database.index(user, params);
  }

  public async getWithIds(user: FrameworkUser, beatIds: string[]) {
    const ids = beatIds.map(beatId => `beat:${beatId}`);

    const params = {
      body: {
        ids,
      },
      index: INDEX_NAMES.BEATS,
    };
    const response = await this.database.mget(user, params);

    return _get(response, 'docs', [])
      .filter((b: any) => b.found)
      .map((b: any) => ({ tags: [], ...b._source.beat }));
  }

  public async getAllWithTags(user: FrameworkUser, tagIds: string[]): Promise<CMBeat[]> {
    const params = {
      ignore: [404],
      index: INDEX_NAMES.BEATS,
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
    return beats.map((beat: any) => ({
      tags: [] as string[],
      ...(omit(beat._source.beat as CMBeat, ['access_token']) as CMBeat),
    }));
  }

  public async getBeatWithToken(
    user: FrameworkUser,
    enrollmentToken: string
  ): Promise<CMBeat | null> {
    const params = {
      ignore: [404],
      index: INDEX_NAMES.BEATS,
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
    return omit<CMBeat, {}>(_get<CMBeat>({ tags: [], ...beats[0] }, '_source.beat'), [
      'access_token',
    ]);
  }

  public async getAll(user: FrameworkUser, ESQuery?: any) {
    const params = {
      index: INDEX_NAMES.BEATS,
      size: 10000,
      ignore: [404],
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

    return beats.map((beat: any) => ({
      tags: [] as string[],
      ...(omit(beat._source.beat as CMBeat, ['access_token']) as CMBeat),
    }));
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
    });
    // console.log(response.items[0].update.error);
    return _get<any>(response, 'items', []).map((item: any, resultIdx: any) => ({
      idxInRequest: assignments[resultIdx].idxInRequest,
      result: item.update.result,
      status: item.update.status,
    }));
  }
}
