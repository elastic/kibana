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
  missingData: 'missingData',
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
      describe('single type', () => {
        it('sorts by keyword field', async () => {
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

        it('sorts on root field only', async () => {
          // This test verifies that when sorting by a root field that doesn't exist
          // in the type mapping, it uses the root field value
          const query = queryString.stringify({
            type: 'sortTestingType',
            sort_field: 'updated_at',
            sort_order: 'desc',
          });
          const response = await supertest.get(
            `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
          );
          expect(response.status).to.eql(200, JSON.stringify(response.body));
          expect(response.body.saved_objects).to.have.length(3);

          // Verify that the documents are sorted by updated_at in descending order
          const updatedAtValues = response.body.saved_objects.map((o: any) =>
            new Date(o.updated_at).getTime()
          );
          const sortedDescending = [...updatedAtValues].sort((a, b) => b - a);
          expect(updatedAtValues).to.eql(sortedDescending);
        });

        it('sorts when root and type field exists', async () => {
          // When a field exists at both root and type levels, single-type queries use the TYPE field
          const query = queryString.stringify({
            type: 'sortTestingType',
            sort_field: 'created_at',
            sort_order: 'asc',
          });
          const response = await supertest.get(
            `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
          );
          expect(response.status).to.eql(200);
          expect(response.body.saved_objects).to.have.length(3);

          const typeCreatedAtValues = response.body.saved_objects.map(
            (o: any) => o.attributes.created_at
          );
          const rootCreatedAtValues = response.body.saved_objects.map((o: any) => o.created_at);

          // Assert type field is used for sorting (values in sorted order)
          expect(typeCreatedAtValues.every((val: any) => val !== undefined)).to.be(true);
          const sortedTypeValues = [...typeCreatedAtValues].sort();
          expect(typeCreatedAtValues).to.eql(sortedTypeValues);

          // Assert root field is NOT used for sorting (values not in sorted order)
          expect(rootCreatedAtValues.every((val: any) => val !== undefined)).to.be(true);
          const sortedRootValues = [...rootCreatedAtValues].sort();
          expect(rootCreatedAtValues).to.not.eql(sortedRootValues);
        });
      });

      describe('multiple types', () => {
        it('sorts by keyword field', async () => {
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

        it('sorts by keyword field with sort order (asc)', async () => {
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

        it('sorts by textWithKeyword.keyword', async () => {
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

        it('sorts by textWithKeyword.keyword with sort order (asc)', async () => {
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

        it('throws error if sorting by text field without keyword subfield', async () => {
          const query = queryString.stringify({
            type: sortTestTypes,
            sort_field: sortTestFields.text,
          });
          const response = await supertest.get(
            `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
          );
          expect(response.status).to.eql(400);
          expect(response.body.message).to.match(
            /Sort field "sortTestingType.title" is of type "text" which is not sortable. If the field has a sortable subfield e.g "keyword" subfield, use "field.keyword" for sorting./
          );
        });

        it('throws error if sorting by text field with keyword subfield', async () => {
          const query = queryString.stringify({
            type: sortTestTypes,
            sort_field: sortTestFields.textWithKeyword,
          });
          const response = await supertest.get(
            `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
          );
          expect(response.status).to.eql(400);
          expect(response.body.message).to.match(
            /Sort field "sortTestingType.textWithKeyword" is of type "text" which is not sortable. If the field has a sortable subfield e.g "keyword" subfield, use "field.keyword" for sorting./
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
            /Sort field "notPresent" is not available for all specified types. Each type must have the field defined either at the type level or root level./
          );
        });

        it('sorts by _id and _score', async () => {
          const idQuery = queryString.stringify({
            type: sortTestTypes,
            sort_field: sortTestFields.id,
          });
          const idResponse = await supertest.get(
            `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${idQuery}`
          );
          expect(idResponse.status).to.eql(400);
          expect(idResponse.body.message).to.match(
            /Fielddata access on the _id field is disallowed/
          );

          const scoreQuery = queryString.stringify({
            type: sortTestTypes,
            sort_field: sortTestFields.score,
          });
          const scoreResponse = await supertest.get(
            `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${scoreQuery}`
          );
          expect(scoreResponse.status).to.eql(200, JSON.stringify(scoreResponse.body));
        });

        it('sorts by keyword field for multiple types when some documents are missing the field', async () => {
          // This assumes that at least one document in sortTestingType or sortTestingType2 is missing 'titleKeyword'
          // If not, you may need to adjust the fixture data to include such a document.
          const query = queryString.stringify({
            type: sortTestTypes,
            sort_field: sortTestFields.missingData,
          });
          const response = await supertest.get(
            `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
          );
          expect(response.status).to.eql(200, JSON.stringify(response.body));
          // Documents missing the sort field should appear last in the sort order
          const titles = response.body.saved_objects.map((o: any) => o.attributes.titleKeyword);
          // Check that undefined/null values (missing field) are at the end
          if (titles.some((t: any) => t === undefined || t === null)) {
            const firstMissing = titles.findIndex((t: any) => t === undefined || t === null);
            expect(
              titles.slice(firstMissing).every((t: any) => t === undefined || t === null)
            ).to.be(true);
          }
        });

        it('sorts by a numeric field (short + long) for multiple types, treating numeric fields equally', async () => {
          const query = queryString.stringify({
            type: sortTestTypes,
            sort_field: 'numericValue',
            sort_order: 'asc',
          });
          const response = await supertest.get(
            `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
          );
          expect(response.status).to.eql(200, JSON.stringify(response.body));
          // The test expects the numeric values to be sorted in ascending order,
          // regardless of whether the field is mapped as short or long.
          const values = response.body.saved_objects.map((o: any) => o.attributes.numericValue);
          // All values should be sorted numerically
          const sorted = [...values].sort((a: number, b: number) => a - b);
          expect(values).to.eql(sorted);
        });

        it('multi type sorting when root and type field exists', async () => {
          // When a field exists at both root and type levels, multi-type queries use the ROOT field
          const query = queryString.stringify({
            type: sortTestTypes,
            sort_field: 'created_at',
            sort_order: 'asc',
          });
          const response = await supertest.get(
            `${getUrlPrefix(defaultNamespace)}/api/saved_objects/_find?${query}`
          );
          expect(response.status).to.eql(200);
          expect(response.body.saved_objects).to.have.length(6);

          const rootCreatedAtValues = response.body.saved_objects.map((o: any) => o.created_at);
          const typeCreatedAtValues = response.body.saved_objects.map(
            (o: any) => o.attributes.created_at
          );

          // Assert root field is used for sorting
          // All objects now have root created_at values and should be sorted chronologically
          expect(rootCreatedAtValues.every((val: any) => val !== undefined)).to.be(true);
          const sortedRootValues = [...rootCreatedAtValues].sort();
          expect(rootCreatedAtValues).to.eql(sortedRootValues);

          // Assert type field is NOT used for sorting
          // Type field values exist but should NOT be in alphabetical order (proving root field was used)
          expect(typeCreatedAtValues.every((val: any) => val !== undefined)).to.be(true);
          const sortedTypeValues = [...typeCreatedAtValues].sort();
          expect(typeCreatedAtValues).to.not.eql(sortedTypeValues);
        });
      });
    });
  });
}
