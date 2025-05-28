/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const spacesService = getService('spaces');

  describe('PUT /internal/spaces/space/{id}/solution', () => {
    describe('For default space', () => {
      beforeEach(async () => {
        await supertest
          .put('/internal/spaces/space/default/solution')
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'cloud')
          .send({
            solution: 'classic',
          })
          .expect(200);
      });

      it('Use solution_type param to set solution', async () => {
        await supertest
          .put('/internal/spaces/space/default/solution')
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'cloud')
          .send({
            solution_type: 'observability',
          })
          .expect(200)
          .then((response) => {
            const { solution, name, id } = response.body;
            expect({ solution, name, id }).to.eql({
              id: 'default',
              name: 'Default',
              solution: 'oblt',
            });
          });
      });

      it('Use solution param to set solution', async () => {
        await supertest
          .put('/internal/spaces/space/default/solution')
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'cloud')
          .send({
            solution: 'oblt',
          })
          .expect(200)
          .then((response) => {
            const { solution, name, id } = response.body;
            expect({ solution, name, id }).to.eql({
              solution: 'oblt',
              id: 'default',
              name: 'Default',
            });
          });
      });
    });

    describe('For Foo Space space', () => {
      before(async () => {
        await spacesService.create({
          id: 'foo-space',
          name: 'Foo Space',
          disabledFeatures: [],
          color: '#AABBCC',
        });
      });

      after(async () => {
        await spacesService.delete('foo-space');
      });

      beforeEach(async () => {
        await supertest
          .put('/internal/spaces/space/foo-space/solution')
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'cloud')
          .send({
            solution: 'classic',
          })
          .expect(200);
      });

      it('Use solution_type param to set solution for Foo Space space', async () => {
        await supertest
          .put('/internal/spaces/space/foo-space/solution')
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'cloud')
          .send({
            solution_type: 'observability',
          })
          .expect(200)
          .then((response) => {
            const { solution, name, id } = response.body;
            expect({ solution, name, id }).to.eql({
              id: 'foo-space',
              name: 'Foo Space',
              solution: 'oblt',
            });
          });
      });

      it('Use solution param to set solution for Foo Space space', async () => {
        await supertest
          .put('/internal/spaces/space/foo-space/solution')
          .set('kbn-xsrf', 'xxx')
          .set('x-elastic-internal-origin', 'cloud')
          .send({
            solution: 'oblt',
          })
          .expect(200)
          .then((response) => {
            const { solution, name, id } = response.body;
            expect({ solution, name, id }).to.eql({
              solution: 'oblt',
              id: 'foo-space',
              name: 'Foo Space',
            });
          });
      });
    });

    it('throw error if solution_type is not supported', async () => {
      const { body } = await supertest
        .put('/internal/spaces/space/default/solution')
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'cloud')
        .send({
          solution_type: 'miami',
        })
        .expect(400);

      expect(body.message).to.eql(
        '[request body]: types that failed validation:\n- [request body.0.solution]: expected at least one defined value but got [undefined]\n- [request body.1.solution_type]: types that failed validation:\n - [request body.solution_type.0]: expected value to equal [security]\n - [request body.solution_type.1]: expected value to equal [observability]\n - [request body.solution_type.2]: expected value to equal [elasticsearch]\n - [request body.solution_type.3]: expected value to equal [search]'
      );
    });

    it('throw error if solution is not supported', async () => {
      const { body } = await supertest
        .put('/internal/spaces/space/default/solution')
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'cloud')
        .send({
          solution: 'miami',
        })
        .expect(400);

      expect(body.message).to.eql(
        '[request body]: types that failed validation:\n- [request body.0.solution]: types that failed validation:\n - [request body.solution.0]: expected value to equal [security]\n - [request body.solution.1]: expected value to equal [oblt]\n - [request body.solution.2]: expected value to equal [es]\n - [request body.solution.3]: expected value to equal [classic]\n- [request body.1.solution_type]: expected at least one defined value but got [undefined]'
      );
    });

    it('throw error if solution and solution_type are defined', async () => {
      const { body } = await supertest
        .put('/internal/spaces/space/default/solution')
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'cloud')
        .send({
          solution: 'oblt',
          solution_type: 'observability',
        })
        .expect(400);

      expect(body.message).to.eql(
        '[request body]: types that failed validation:\n- [request body.0.solution_type]: definition for this key is missing\n- [request body.1.solution]: definition for this key is missing'
      );
    });

    it('throw error if solution and solution_type are not defined', async () => {
      const { body } = await supertest
        .put('/internal/spaces/space/default/solution')
        .set('kbn-xsrf', 'xxx')
        .set('x-elastic-internal-origin', 'cloud')
        .send({})
        .expect(400);

      expect(body.message).to.eql(
        '[request body]: types that failed validation:\n- [request body.0.solution]: expected at least one defined value but got [undefined]\n- [request body.1.solution_type]: expected at least one defined value but got [undefined]'
      );
    });

    it('returns 404 when the space is not found', async () => {
      await supertest
        .get('/internal/spaces/space/not-found-space/solution')
        .set('kbn-xsrf', 'xxx')
        .expect(404, {
          statusCode: 404,
          error: 'Not Found',
          message: 'Not Found',
        });
    });
  });
}
