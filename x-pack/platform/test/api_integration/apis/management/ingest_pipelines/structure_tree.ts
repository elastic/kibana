/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const ingestPipelines = getService('ingestPipelines');
  const es = getService('es');
  const url = `/api/ingest_pipelines/structure_tree`;

  /**
   * This function generates a Geometric series tree of {@link levels} levels and each node
   * on each level has {@link childrenPerNode} children.
   *
   * This creates a total of 1 + N + N^2 + N^3 + ... + N^(M-1) unique pipelines,
   * where N is {@link childrenPerNode} and M is {@link levels}.
   *
   * For example, a tree with 3 levels and 3 children per node:
   * treePipeline   // root
   * ├── treePipeline-0
   * │   ├── treePipeline-0_0
   * │   ├── treePipeline-0_1
   * │   └── treePipeline-0_2
   * ├── treePipeline-1
   * │   ├── treePipeline-1_0
   * │   ├── treePipeline-1_1
   * │   └── treePipeline-1_2
   * └── treePipeline-2
   *     ├── treePipeline-2_0
   *     ├── treePipeline-2_1
   *     └── treePipeline-2_2
   */
  const createComplexTree = async (levels: number, childrenPerNode: number) => {
    const createdPipelines: string[] = [];
    const getPipelineIdFromPath = (path: number[]): string =>
      path.length === 0 ? 'treePipeline' : `treePipeline-${path.join('_')}`;

    const createNode = async (currentLevel: number, path: number[]): Promise<string> => {
      const pipelineId = getPipelineIdFromPath(path);
      const processors: any[] = [{ set: { field: 'foo', value: 'bar' } }];

      if (currentLevel < levels) {
        for (let i = 0; i < childrenPerNode; i++) {
          const childId = await createNode(currentLevel + 1, [...path, i]);
          processors.push({ pipeline: { name: childId } });
        }
      }

      await ingestPipelines.api.createPipeline({
        id: pipelineId,
        deprecated: currentLevel % 2 === 0, // Add some variation in properties
        _meta: {
          managed: currentLevel % 3 === 0,
        },
        processors,
      });
      createdPipelines.push(pipelineId);
      return pipelineId;
    };

    // Start with the root path []
    await createNode(1, []);
    return createdPipelines;
  };

  const deletePipelines = async (pipelinesToDelete: string[]) => {
    for (const pipeline of pipelinesToDelete) {
      await es.ingest.deletePipeline({ id: pipeline });
    }
  };

  describe('Pipeline structure tree', function () {
    const createdPipelines: string[] = [];
    before(async () => {
      // Create a complex tree of 7 levels and 5 children per node
      const treePipelines = await createComplexTree(7, 3);
      createdPipelines.push(...treePipelines);
    });

    after(async () => {
      // Create a complex tree of 10 levels and 10 children per node
      await deletePipelines(createdPipelines);
    });

    it('can fetch a complex structure tree up to the 5th level', async () => {
      const {
        body: { pipelineStructureTree: resultTree },
      } = await supertest.get(`${url}/treePipeline`).set('kbn-xsrf', 'xxx').expect(200);

      // Level 1 (root):
      expect(resultTree.pipelineName).to.eql('treePipeline');
      // Level 2:
      expect(resultTree.children[2].pipelineName).to.eql('treePipeline-2');
      // Level 3:
      expect(resultTree.children[1].children[2].pipelineName).to.eql('treePipeline-1_2');
      // Level 4:
      expect(resultTree.children[0].children[2].children[1].pipelineName).to.eql(
        'treePipeline-0_2_1'
      );
      // Level 5:
      expect(resultTree.children[2].children[1].children[0].children[2].pipelineName).to.eql(
        'treePipeline-2_1_0_2'
      );
      // Level 6:
      expect(
        resultTree.children[2].children[0].children[2].children[1].children[0].pipelineName
      ).to.eql('treePipeline-2_0_2_1_0');
      // Verify that we don't fetch beyond the 6th level:
      expect(
        resultTree.children[2].children[0].children[2].children[1].children[0].children
      ).to.be.empty();
    });
  });
}
