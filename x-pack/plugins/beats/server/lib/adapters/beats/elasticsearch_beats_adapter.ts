/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, get, omit } from 'lodash';
import { INDEX_NAMES } from '../../../../common/constants';
import {
  BackendFrameworkAdapter,
  CMBeat,
  CMBeatsAdapter,
  CMTagAssignment,
  FrameworkRequest,
} from '../../lib';

export class ElasticsearchBeatsAdapter implements CMBeatsAdapter {
  private framework: BackendFrameworkAdapter;

  constructor(framework: BackendFrameworkAdapter) {
    this.framework = framework;
  }

  public async insertBeat(beat: CMBeat) {
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
    await this.framework.callWithInternalUser('create', params);
  }

  public async getBeatsWithIds(req: FrameworkRequest, beatIds: string[]) {
    const ids = beatIds.map(beatId => `beat:${beatId}`);

    const params = {
      _source: false,
      body: {
        ids,
      },
      index: INDEX_NAMES.BEATS,
      type: '_doc',
    };
    const response = await this.framework.callWithRequest(req, 'mget', params);
    return get(response, 'docs', []);
  }

  public async getBeats(req: FrameworkRequest) {
    const params = {
      index: INDEX_NAMES.BEATS,
      q: 'type:beat',
      type: '_doc',
    };
    const response = await this.framework.callWithRequest(
      req,
      'search',
      params
    );

    const beats = get(response, 'hits.hits', []);
    return beats.map(beat => omit(beat._source.beat, ['access_token']));
  }

  public async removeTagsFromBeats(
    req: FrameworkRequest,
    removals: CMTagAssignment[]
  ): Promise<CMTagAssignment[]> {
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

    const params = {
      body,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    };

    const response = await this.framework.callWithRequest(req, 'bulk', params);
    return get(response, 'items', []).map((item, resultIdx) => ({
      idxInRequest: removals[resultIdx].idxInRequest,
      result: item.update.result,
      status: item.update.status,
    }));
  }

  // formerly persistAssignments
  public async assignTagsToBeats(
    req: FrameworkRequest,
    assignments: CMTagAssignment[]
  ): Promise<CMTagAssignment[]> {
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

    const params = {
      body,
      index: INDEX_NAMES.BEATS,
      refresh: 'wait_for',
      type: '_doc',
    };

    const response = await this.framework.callWithRequest(req, 'bulk', params);
    return get(response, 'items', []).map((item, resultIdx) => ({
      idxInRequest: assignments[resultIdx].idxInRequest,
      result: item.update.result,
      status: item.update.status,
    }));
  }
}
