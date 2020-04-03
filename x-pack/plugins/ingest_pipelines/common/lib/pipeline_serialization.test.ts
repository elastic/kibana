/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { deserializePipelines } from './pipeline_serialization';

describe('pipeline_serialization', () => {
  describe('deserializePipelines()', () => {
    it('should deserialize pipelines', () => {
      expect(
        deserializePipelines({
          pipeline1: {
            description: 'pipeline 1 description',
            version: 1,
            processors: [
              {
                script: {
                  source: 'ctx._type = null',
                },
              },
            ],
          },
          pipeline2: {
            description: 'pipeline2 description',
            version: 1,
            processors: [],
          },
        })
      ).toEqual([
        {
          name: 'pipeline1',
          description: 'pipeline 1 description',
          version: 1,
          processors: [
            {
              script: {
                source: 'ctx._type = null',
              },
            },
          ],
        },
        {
          name: 'pipeline2',
          description: 'pipeline2 description',
          version: 1,
          processors: [],
        },
      ]);
    });
  });
});
