/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, get as _get, omit } from 'lodash';
import moment from 'moment';
import { INDEX_NAMES } from '../../../../common/constants';
import { CMBeat } from '../../../../common/domain_types';
import { DatabaseAdapter } from '../database/adapter_types';
import { FrameworkRequest } from '../famework/adapter_types';
import { BeatsTagAssignment, CMBeatsAdapter } from './adapter_types';

export class ElasticsearchBeatsAdapter implements CMBeatsAdapter {
  private database: DatabaseAdapter;

  constructor(database: DatabaseAdapter) {
    this.database = database;
  }

  public async get(id: string) {
    const params = {
      id: `beat:${id}`,
      ignore: [404],
      index: INDEX_NAMES.BEATS,
      type: '_doc',
    };

    const response = await this.database.get(null, params);
    if (!response.found) {
      return null;
    }

    return _get(response, '_source.beat');
  }

  public async insert(beat: CMBeat) {
    const body = {
      beat,
      type: 'beat',
    };

    await this.database.create(null, {
      body,
      id: `beat:${beat.id}`,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    });
  }

  public async update(beat: CMBeat) {
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
    await this.database.index(null, params);
  }

  public async getWithIds(req: FrameworkRequest, beatIds: string[]) {
    const ids = beatIds.map(beatId => `beat:${beatId}`);

    const params = {
      _sourceInclude: ['beat.id', 'beat.verified_on'],
      body: {
        ids,
      },
      index: INDEX_NAMES.BEATS,
      type: '_doc',
    };
    const response = await this.database.mget(req, params);

    return _get(response, 'docs', [])
      .filter((b: any) => b.found)
      .map((b: any) => b._source.beat);
  }

  public async verifyBeats(req: FrameworkRequest, beatIds: string[]) {
    if (!Array.isArray(beatIds) || beatIds.length === 0) {
      return [];
    }

    const verifiedOn = moment().toJSON();
    const body = flatten(
      beatIds.map(beatId => [
        { update: { _id: `beat:${beatId}` } },
        { doc: { beat: { verified_on: verifiedOn } } },
      ])
    );

    const response = await this.database.bulk(req, {
      _sourceInclude: ['beat.id', 'beat.verified_on'],
      body,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    });

    return _get(response, 'items', []).map(b => ({
      ..._get(b, 'update.get._source.beat', {}),
      updateStatus: _get(b, 'update.result', 'unknown error'),
    }));
  }

  public async getAll(req: FrameworkRequest) {
    const params = {
      index: INDEX_NAMES.BEATS,
      q: 'type:beat',
      type: '_doc',
    };
    const response = await this.database.search(req, params);

    const beats = _get<any>(response, 'hits.hits', []);
    return beats.map((beat: any) => omit(beat._source.beat, ['access_token']));
  }

  public async removeTagsFromBeats(
    req: FrameworkRequest,
    removals: BeatsTagAssignment[]
  ): Promise<BeatsTagAssignment[]> {
    const body = flatten(
      removals.map(({ beatId, tag }) => {
        const script =
          '' +
          'def beat = ctx._source.beat; ' +
          'if (beat.tags != null) { ' +
          '  beat.tags.removeAll([params.tag]); ' +
          '}';

        return [
          { update: { _id: `beat:${beatId}` } },
          { script: { source: script, params: { tag } } },
        ];
      })
    );

    const response = await this.database.bulk(req, {
      body,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    });
    return _get<any>(response, 'items', []).map(
      (item: any, resultIdx: number) => ({
        idxInRequest: removals[resultIdx].idxInRequest,
        result: item.update.result,
        status: item.update.status,
      })
    );
  }

  public async assignTagsToBeats(
    req: FrameworkRequest,
    assignments: BeatsTagAssignment[]
  ): Promise<BeatsTagAssignment[]> {
    const body = flatten(
      assignments.map(({ beatId, tag }) => {
        const script =
          '' +
          'def beat = ctx._source.beat; ' +
          'if (beat.tags == null) { ' +
          '  beat.tags = []; ' +
          '} ' +
          'if (!beat.tags.contains(params.tag)) { ' +
          '  beat.tags.add(params.tag); ' +
          '}';

        return [
          { update: { _id: `beat:${beatId}` } },
          { script: { source: script, params: { tag } } },
        ];
      })
    );

    const response = await this.database.bulk(req, {
      body,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    });
    return _get<any>(response, 'items', []).map(
      (item: any, resultIdx: any) => ({
        idxInRequest: assignments[resultIdx].idxInRequest,
        result: item.update.result,
        status: item.update.status,
      })
    );
  }
}
