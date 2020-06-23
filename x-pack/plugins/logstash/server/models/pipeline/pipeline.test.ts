/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Pipeline } from './pipeline';

describe('pipeline', () => {
  describe('Pipeline', () => {
    describe('fromUpstreamJSON factory method', () => {
      const upstreamJSON = {
        _id: 'apache',
        _source: {
          description: 'this is an apache pipeline',
          pipeline_metadata: {
            version: 1,
            type: 'logstash_pipeline',
          },
          username: 'elastic',
          pipeline: 'input {} filter { grok {} }\n output {}',
        },
      };

      it('returns correct Pipeline instance', () => {
        const pipeline = Pipeline.fromUpstreamJSON(upstreamJSON);
        expect(pipeline.id).toBe(upstreamJSON._id);
        expect(pipeline.description).toBe(upstreamJSON._source.description);
        expect(pipeline.username).toBe(upstreamJSON._source.username);
        expect(pipeline.pipeline).toBe(upstreamJSON._source.pipeline);
      });

      it('throws if pipeline argument does not contain an id property', () => {
        const badJSON = {
          // no _id
          _source: upstreamJSON._source,
        };
        const testFromUpstreamJsonError = () => {
          return Pipeline.fromUpstreamJSON(badJSON);
        };
        expect(testFromUpstreamJsonError).toThrowError(
          /upstreamPipeline argument must contain an id property/i
        );
      });
    });

    describe('upstreamJSON getter method', () => {
      it('returns the upstream JSON', () => {
        const downstreamJSON = {
          id: 'apache',
          description: 'this is an apache pipeline',
          username: 'elastic',
          pipeline: 'input {} filter { grok {} }\n output {}',
        };
        const pipeline = new Pipeline(downstreamJSON);
        const expectedUpstreamJSON = {
          description: 'this is an apache pipeline',
          pipeline_metadata: {
            type: 'logstash_pipeline',
            version: 1,
          },
          username: 'elastic',
          pipeline: 'input {} filter { grok {} }\n output {}',
        };
        // can't do an object level comparison because modified field is always `now`
        expect(pipeline.upstreamJSON.last_modified).toStrictEqual(expect.any(String));
        expect(pipeline.upstreamJSON.description).toBe(expectedUpstreamJSON.description);
        expect(pipeline.upstreamJSON.pipeline_metadata).toEqual(
          expectedUpstreamJSON.pipeline_metadata
        );
        expect(pipeline.upstreamJSON.pipeline).toBe(expectedUpstreamJSON.pipeline);
      });
    });
  });
});
