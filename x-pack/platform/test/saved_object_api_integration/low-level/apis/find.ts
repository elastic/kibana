/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * The purpose of these tests are to verify the low-level outcome of a bulk update operation
 * when the object namespace is overridden in the request parameters. This optional override
 * allows objects that do not reside in the current space to be updated in the operation.
 * The SO documents should reflect the correct namespace, based on where they actually reside.
 */

import expect from '@kbn/expect';
import queryString from 'query-string';
import { getUrlPrefix } from '../../../alerting_api_integration/common/lib';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  const defaultNamespace = 'default';

  describe('low-level saved object find api integration', () => {
    before(() =>
      esArchiver.load(
        'x-pack/platform/test/saved_object_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
      )
    );
    after(() =>
      esArchiver.unload(
        'x-pack/platform/test/saved_object_api_integration/common/fixtures/es_archiver/saved_objects/spaces'
      )
    );

    describe('when the query includes search fields of type nested', () => {
      it('finds the right document, single nested search field', async () => {
        const query = queryString.stringify({
          type: 'nestedtype',
          search_fields: ['comments.user'],
          search: 'bob',
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(200, JSON.stringify(response.body));
        const savedObjects = JSON.parse(response.text).saved_objects;
        expect(savedObjects.length).to.be(2);
        expect(savedObjects[0].attributes.comments[0].user).to.be('bob');
        expect(savedObjects[1].attributes.comments[1].user).to.be('bob');
        // extra checks to ensure the nested field is returned
        expect(savedObjects[0].attributes.title).to.be('elasticsearch');
        expect(savedObjects[0].attributes.author).to.be('John Doe');
        expect(savedObjects[1].attributes.title).to.be('logstash');
        expect(savedObjects[1].attributes.author).to.be('Mr Nobody');
      });

      it('finds the right document, nested and simple search fields', async () => {
        const query = queryString.stringify({
          type: 'nestedtype',
          search_fields: ['comments.message', 'title'],
          search: 'kibana',
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(200, JSON.stringify(response.body));
        const savedObjects = JSON.parse(response.text).saved_objects;
        expect(savedObjects.length).to.be(2);
        expect(savedObjects[0].attributes.comments[1].message).to.contain('kibana');
        expect(savedObjects[1].attributes.title).to.be('kibana');
        // extra checks to ensure the nested field is returned
        expect(savedObjects[0].attributes.title).to.be('elasticsearch');
        expect(savedObjects[0].attributes.author).to.be('John Doe');
        expect(savedObjects[1].attributes.author).to.be('Jane Smith');
      });

      it('finds the right document, multiple nested search fields', async () => {
        const query = queryString.stringify({
          type: 'nestedtype',
          search_fields: ['comments.user', 'comments.message'],
          search: 'charlie',
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(200, JSON.stringify(response.body));
        const savedObjects = JSON.parse(response.text).saved_objects;
        expect(savedObjects.length).to.be(2);
        expect(savedObjects[0].attributes.comments[0].user).to.be('charlie');
        expect(savedObjects[1].attributes.comments[1].message).to.contain('charlie');
        // extra checks to ensure the nested field is returned
        expect(savedObjects[0].attributes.title).to.be('kibana');
        expect(savedObjects[0].attributes.author).to.be('Jane Smith');
        expect(savedObjects[1].attributes.title).to.be('logstash');
        expect(savedObjects[1].attributes.author).to.be('Mr Nobody');
      });
    });
  });
}
