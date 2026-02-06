/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { chatSystemIndex } from '@kbn/agent-builder-server';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { deleteTool } from '../../utils/tools';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Legacy tool type migration', () => {
    const legacyToolId = 'legacy-esql-tool-types-migration';
    const dummyToolId = `dummy-tool-${Date.now()}`;
    const toolIndex = chatSystemIndex('tools');
    const timestamp = new Date().toISOString();
    const legacyConfig = {
      query:
        'FROM my_cases | WHERE t == ?t AND k == ?k AND l == ?l AND i == ?i AND d == ?d AND f == ?f AND b == ?b AND dt == ?dt AND o == ?o AND n == ?n',
      params: {
        t: {
          type: 'text',
          description: 'text',
          optional: true,
          defaultValue: 'hello',
        },
        k: {
          type: 'keyword',
          description: 'keyword',
          optional: true,
          defaultValue: 'world',
        },
        l: {
          type: 'long',
          description: 'long',
          optional: true,
          defaultValue: 42,
        },
        i: {
          type: 'integer',
          description: 'integer',
          optional: true,
          defaultValue: 7,
        },
        d: {
          type: 'double',
          description: 'double',
          optional: true,
          defaultValue: 3.14,
        },
        f: {
          type: 'float',
          description: 'float',
          optional: true,
          defaultValue: 2.5,
        },
        b: {
          type: 'boolean',
          description: 'boolean',
          optional: true,
          defaultValue: false,
        },
        dt: {
          type: 'date',
          description: 'date',
          optional: true,
          defaultValue: '2024-01-01T00:00:00.000Z',
        },
        o: {
          type: 'object',
          description: 'object',
          optional: true,
          defaultValue: { foo: 'bar' },
        },
        n: {
          type: 'nested',
          description: 'nested',
          optional: true,
          defaultValue: [{ foo: 'bar' }, { foo: 'baz' }],
        },
      },
    };

    before(async () => {
      // Create a dummy ES|QL tool via the API to ensure the tools index exists.
      await supertest
        .post('/api/agent_builder/tools')
        .set('kbn-xsrf', 'kibana')
        .send({
          id: dummyToolId,
          type: 'esql',
          description: 'Dummy ES|QL tool for bootstrapping tools index',
          tags: ['test'],
          configuration: {
            query: 'FROM my_cases | LIMIT 1',
            params: {},
          },
        })
        .expect(200);

      await es.index({
        index: toolIndex,
        document: {
          id: legacyToolId,
          type: 'esql',
          space: 'default',
          description: 'Legacy ES|QL tool',
          configuration: legacyConfig,
          tags: ['legacy'],
          created_at: timestamp,
          updated_at: timestamp,
        },
      });
      await es.indices.refresh({ index: toolIndex });
    });

    after(async () => {
      await deleteTool(legacyToolId, { space: 'default', supertest }).catch(() => {});
      await deleteTool(dummyToolId, { space: 'default', supertest }).catch(() => {});
    });

    it('migrates legacy types on get', async () => {
      const response = await supertest.get(`/api/agent_builder/tools/${legacyToolId}`).expect(200);

      expect(response.body).to.have.property('configuration');
      expect(response.body.configuration).to.eql({
        query: legacyConfig.query,
        params: {
          t: {
            type: 'string',
            description: 'text',
            optional: true,
            defaultValue: 'hello',
          },
          k: {
            type: 'string',
            description: 'keyword',
            optional: true,
            defaultValue: 'world',
          },
          l: {
            type: 'integer',
            description: 'long',
            optional: true,
            defaultValue: 42,
          },
          i: {
            type: 'integer',
            description: 'integer',
            optional: true,
            defaultValue: 7,
          },
          d: {
            type: 'float',
            description: 'double',
            optional: true,
            defaultValue: 3.14,
          },
          f: {
            type: 'float',
            description: 'float',
            optional: true,
            defaultValue: 2.5,
          },
          b: {
            type: 'boolean',
            description: 'boolean',
            optional: true,
            defaultValue: false,
          },
          dt: {
            type: 'date',
            description: 'date',
            optional: true,
            defaultValue: '2024-01-01T00:00:00.000Z',
          },
          o: {
            type: 'string',
            description: 'object',
            optional: true,
            defaultValue: JSON.stringify({ foo: 'bar' }),
          },
          n: {
            type: 'string',
            description: 'nested',
            optional: true,
            defaultValue: JSON.stringify([{ foo: 'bar' }, { foo: 'baz' }]),
          },
        },
      });
    });

    it('migrates legacy types on list', async () => {
      const response = await supertest.get('/api/agent_builder/tools').expect(200);
      const tool = response.body.results.find(
        (result: { id: string }) => result.id === legacyToolId
      );

      expect(tool).to.be.ok();
      expect(tool.configuration.params.t.type).to.be('string');
      expect(tool.configuration.params.k.type).to.be('string');
      expect(tool.configuration.params.l.type).to.be('integer');
      expect(tool.configuration.params.i.type).to.be('integer');
      expect(tool.configuration.params.d.type).to.be('float');
      expect(tool.configuration.params.f.type).to.be('float');
      expect(tool.configuration.params.b.type).to.be('boolean');
      expect(tool.configuration.params.dt.type).to.be('date');
      expect(tool.configuration.params.o.type).to.be('string');
      expect(tool.configuration.params.o.defaultValue).to.be(JSON.stringify({ foo: 'bar' }));
      expect(tool.configuration.params.n.type).to.be('string');
      expect(tool.configuration.params.n.defaultValue).to.be(
        JSON.stringify([{ foo: 'bar' }, { foo: 'baz' }])
      );
    });
  });
}
