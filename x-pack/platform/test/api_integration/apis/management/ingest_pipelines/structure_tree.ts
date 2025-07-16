/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const ingestPipelines = getService('ingestPipelines');
  const es = getService('es');
  const url = `/api/ingest_pipelines/structure_tree`;
  const rootPipelineName = 'root';

  /**
   * This function generates a tree of {@link levels} levels and each node
   * on each level has {@link childrenPerNode} children.
   *
   * For example, the 5th child of the `pipeline-level2-child1` node would be `pipeline-level3-child5`
   */
  const createComplexTree = async (levels: number, childrenPerNode: number) => {
    const getChildrenProcessors = (level: number) => {
      const pipelineProcessors = [];
      for (let child = 1; child <= childrenPerNode; child++) {
        pipelineProcessors.push({
          pipeline: {
            name: `pipeline-level${level}-child${child}`,
          },
        });
      }
      return pipelineProcessors;
    };

    let currentLevel = levels;
    while (currentLevel > 1) {
      for (let child = 1; child <= childrenPerNode; child++) {
        const childrenProcessors =
          currentLevel === levels ? [] : getChildrenProcessors(currentLevel + 1);
        await ingestPipelines.api.createPipeline({
          id: `pipeline-level${currentLevel}-child${child}`,
          deprecated: true,
          _meta: {
            managed: true,
          },
          processors: [{ set: { field: 'foo', value: 'bar' } }, ...childrenProcessors],
        });
      }
      currentLevel--;
    }
    // In the end, create the root:
    await ingestPipelines.api.createPipeline({
      id: rootPipelineName,
      deprecated: true,
      _meta: {
        managed: true,
      },
      processors: [{ set: { field: 'foo', value: 'bar' } }, ...getChildrenProcessors(2)],
    });
  };

  const deleteComplexTree = async (levels: number, childrenPerNode: number) => {
    let currentLevel = levels;
    while (currentLevel > 1) {
      for (let child = 1; child <= childrenPerNode; child++) {
        await es.ingest.deletePipeline({ id: `pipeline-level${currentLevel}-child${child}` });
      }
      currentLevel--;
    }
    // In the end, delete the root:
    await es.ingest.deletePipeline({ id: rootPipelineName });
  };

  describe('Pipeline structure tree', function () {
    before(async () => {
      // Create a complex tree of 10 levels and 10 children per node
      await createComplexTree(10, 10);
    });

    after(async () => {
      // Create a complex tree of 10 levels and 10 children per node
      await deleteComplexTree(10, 10);
    });

    it('can fetch a complex structure tree up to the 5th level', async () => {
      const {
        body: { pipelineStructureTree },
      } = await supertest.get(`${url}/root`).set('kbn-xsrf', 'xxx').expect(200);

      expect(pipelineStructureTree.pipelineName).to.eql('root');
      const level2children = pipelineStructureTree.children;
      expect(level2children[4].pipelineName).to.eql('pipeline-level2-child5');
      const level3children = pipelineStructureTree.children[7].children;
      expect(level3children[2].pipelineName).to.eql('pipeline-level3-child3');
      const level4children = pipelineStructureTree.children[1].children[3].children;
      expect(level4children[9].pipelineName).to.eql('pipeline-level4-child10');
      const level5children = pipelineStructureTree.children[6].children[8].children[0].children;
      expect(level5children[6].pipelineName).to.eql('pipeline-level5-child7');
      const level6children =
        pipelineStructureTree.children[7].children[3].children[2].children[9].children;
      expect(level6children[1].pipelineName).to.eql('pipeline-level6-child2');
      // Verify that we only fetch up to the 5th level
      expect(level6children[8].children).to.be.empty();
    });
  });
}
