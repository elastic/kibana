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

const sortTestTypes = ['sortTestingType', 'sortTestingType2'];
const sortTestFields = {
  keyword: 'titleKeyword',
  textWithKeyword: 'textWithKeyword',
  text: 'title',
  missing: 'notPresent',
  id: '_id',
  score: '_score',
};

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

    describe('sorting', () => {
      it('sorts by keyword field for single type', async () => {
        const query = queryString.stringify({
          type: 'sortTestingType',
          sort_field: sortTestFields.keyword,
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(200, JSON.stringify(response.body));
        expect(response.body.saved_objects.map((o: any) => o.attributes.titleKeyword)).to.eql([
          'alpha',
          'bravo',
          'echo',
        ]);
        expect(response.body.saved_objects.map((o: any) => o.type)).to.eql([
          'sortTestingType',
          'sortTestingType',
          'sortTestingType',
        ]);
      });

      it('sorts by keyword field for multiple types', async () => {
        const query = queryString.stringify({
          type: sortTestTypes,
          sort_field: sortTestFields.keyword,
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(200, JSON.stringify(response.body));
        // Verify the sorted order for both types
        expect(response.body.saved_objects.map((o: any) => o.attributes.titleKeyword)).to.eql([
          'alpha',
          'alpha2',
          'bravo',
          'bravo2',
          'echo',
          'echo2',
        ]);
        expect(response.body.saved_objects.map((o: any) => o.type)).to.eql([
          'sortTestingType',
          'sortTestingType2',
          'sortTestingType',
          'sortTestingType2',
          'sortTestingType',
          'sortTestingType2',
        ]);
      });

      it('sorts by keyword field for multiple types (asc)', async () => {
        const query = queryString.stringify({
          type: sortTestTypes,
          sort_field: sortTestFields.keyword,
          sort_order: 'asc',
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(200, JSON.stringify(response.body));
        expect(response.body.saved_objects.map((o: any) => o.attributes.titleKeyword)).to.eql([
          'alpha',
          'alpha2',
          'bravo',
          'bravo2',
          'echo',
          'echo2',
        ]);
      });

      it('sorts by text field with keyword subfield for multiple types', async () => {
        const query = queryString.stringify({
          type: sortTestTypes,
          sort_field: sortTestFields.textWithKeyword,
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(200, JSON.stringify(response.body));
        expect(response.body.saved_objects.map((o: any) => o.attributes.textWithKeyword)).to.eql([
          'victor',
          'victor2',
          'yankee',
          'yankee2',
          'zulu',
          'zulu2',
        ]);
      });

      it('sorts by textWithKeyword.keyword for multiple types (asc)', async () => {
        const query = queryString.stringify({
          type: sortTestTypes,
          sort_field: 'textWithKeyword.keyword',
          sort_order: 'asc',
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(200, JSON.stringify(response.body));
        expect(response.body.saved_objects.map((o: any) => o.attributes.textWithKeyword)).to.eql([
          'victor',
          'victor2',
          'yankee',
          'yankee2',
          'zulu',
          'zulu2',
        ]);
      });

      it('throws error if sorting by text field without keyword subfield for multiple types', async () => {
        const query = queryString.stringify({
          type: sortTestTypes,
          sort_field: sortTestFields.text,
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(400);
        expect(response.body.message).to.match(
          /Sort field ".*\.title" is of type "text" and does not have a "keyword" subfield/
        );
      });

      it('throws error if sorting by text field for single type', async () => {
        const query = queryString.stringify({
          type: 'sortTestingType',
          sort_field: 'title',
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(400);
        expect(response.body.message).to.match(
          /Fielddata is disabled on \[sortTestingType.title].*Please use a keyword field instead/
        );
      });

      it('throws error if sorting field is missing in one of the types', async () => {
        const query = queryString.stringify({
          type: sortTestTypes,
          sort_field: sortTestFields.missing,
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(400);
        expect(response.body.message).to.match(
          /Sort field "notPresent" must be present in all types/
        );
      });

      it('sorts by _id and _score for multiple types', async () => {
        const idQuery = queryString.stringify({
          type: sortTestTypes,
          sort_field: sortTestFields.id,
        });
        const idResponse = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${idQuery}`
        );
        expect(idResponse.status).to.eql(400);
        expect(idResponse.body.message).to.match(/Fielddata access on the _id field is disallowed/);

        const scoreQuery = queryString.stringify({
          type: sortTestTypes,
          sort_field: sortTestFields.score,
        });
        const scoreResponse = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${scoreQuery}`
        );
        expect(scoreResponse.status).to.eql(200, JSON.stringify(scoreResponse.body));
      });

      it('throws error if sort field is unknown', async () => {
        const query = queryString.stringify({
          type: 'sortTestingType',
          sort_field: 'unknownField',
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(400);
        expect(response.body.message).to.match(/Unknown sort field unknownField/);
      });

      it('sorts by textWithKeyword.keyword for single type', async () => {
        const query = queryString.stringify({
          type: 'sortTestingType',
          sort_field: 'textWithKeyword.keyword',
          sort_order: 'desc',
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(200, JSON.stringify(response.body));
        expect(response.body.saved_objects.map((o: any) => o.attributes.textWithKeyword)).to.eql([
          'zulu',
          'yankee',
          'victor',
        ]);
      });

      it('sorts by textWithKeyword.keyword for multiple types', async () => {
        const query = queryString.stringify({
          type: sortTestTypes,
          sort_field: 'textWithKeyword.keyword',
          sort_order: 'desc',
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(200, JSON.stringify(response.body));
        expect(response.body.saved_objects.map((o: any) => o.attributes.textWithKeyword)).to.eql([
          'zulu2',
          'zulu',
          'yankee2',
          'yankee',
          'victor2',
          'victor',
        ]);
      });

      it('throws error if sort field is not present in single type', async () => {
        const query = queryString.stringify({
          type: 'sortTestingType',
          sort_field: 'notPresent',
        });
        const response = await supertest.get(
          `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
        );
        expect(response.status).to.eql(400);
        expect(response.body.message).to.match(/Unknown sort field notPresent/);
      });
    });
  });
}
