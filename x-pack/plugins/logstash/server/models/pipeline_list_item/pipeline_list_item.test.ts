/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PipelineListItem } from './pipeline_list_item';

describe('pipeline_list_item', () => {
  describe('PipelineListItem', () => {
    const upstreamJSON = {
      _id: 'apache',
      _source: {
        description: 'this is an apache pipeline',
        last_modified: '2017-05-14T02:50:51.250Z',
        pipeline_metadata: {
          type: 'logstash_pipeline',
          version: 1,
        },
        username: 'elastic',
        pipeline: 'input {} filter { grok {} }\n output {}',
      },
      _index: 'index',
      _type: 'type',
      _score: 100,
    };

    describe('fromUpstreamJSON factory method', () => {
      it('returns correct PipelineListItem instance', () => {
        const pipelineListItem = PipelineListItem.fromUpstreamJSON(upstreamJSON);
        expect(pipelineListItem.id).toBe(upstreamJSON._id);
        expect(pipelineListItem.description).toBe(upstreamJSON._source.description);
        expect(pipelineListItem.username).toBe(upstreamJSON._source.username);
        expect(pipelineListItem.last_modified).toBe(upstreamJSON._source.last_modified);
      });
    });

    describe('downstreamJSON getter method', () => {
      it('returns the downstreamJSON JSON', () => {
        const pipelineListItem = PipelineListItem.fromUpstreamJSON(upstreamJSON);
        const expectedDownstreamJSON = {
          id: 'apache',
          description: 'this is an apache pipeline',
          username: 'elastic',
          last_modified: '2017-05-14T02:50:51.250Z',
        };
        expect(pipelineListItem.downstreamJSON).toEqual(expectedDownstreamJSON);
      });
    });
  });
});
