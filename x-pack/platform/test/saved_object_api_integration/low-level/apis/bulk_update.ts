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

import expect from 'expect';
import { getUrlPrefix } from '../../../alerting_api_integration/common/lib';
import { FtrProviderContext } from '../../common/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const es = getService('es');

  const defaultNamespace = 'default';

  const namespaceAgnosticObject = {
    type: 'globaltype',
    id: 'globaltype-id',
    attributes: {
      title: 'Updated title attribute!',
    },
  };

  const singleDefaultNamespaceObject = {
    type: 'isolatedtype',
    id: 'defaultspace-isolatedtype-id',
    attributes: {
      title: 'Updated title attribute!',
    },
  };

  const multiDefaultNamespaceObject = {
    type: 'index-pattern',
    id: 'defaultspace-index-pattern-id',
    attributes: {
      title: 'Updated title attribute!',
    },
  };

  describe('low-level saved object api integration', () => {
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

    describe('with object namespace override', () => {
      describe('from the default space', () => {
        const singleNamespaceObject = {
          type: 'isolatedtype',
          id: 'space1-isolatedtype-id',
          attributes: {
            title: 'Updated title attribute!',
          },
        };

        const multiNamespaceObject = {
          type: 'index-pattern',
          id: 'space1-index-pattern-id',
          attributes: {
            title: 'Updated title attribute!',
          },
        };

        const namespace = 'space_1';

        it('handles single namespace objects in an non-default space', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(defaultNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...singleNamespaceObject, namespace }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [
              expect.objectContaining({ ...singleNamespaceObject, namespaces: [namespace] }),
            ],
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana',
            id: `${namespace}:${singleNamespaceObject.type}:${singleNamespaceObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [singleNamespaceObject.type]: expect.objectContaining({
                ...singleNamespaceObject.attributes,
              }),
              namespace, // namespace has not changed
            })
          );
          expect(result._source).not.toHaveProperty('namespaces');
        });

        it('handles single namespace objects in the default space', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(defaultNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...singleDefaultNamespaceObject, namespace: defaultNamespace }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [
              expect.objectContaining({
                ...singleDefaultNamespaceObject,
                namespaces: [defaultNamespace],
              }),
            ],
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana',
            id: `${singleDefaultNamespaceObject.type}:${singleDefaultNamespaceObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [singleDefaultNamespaceObject.type]: expect.objectContaining({
                ...singleDefaultNamespaceObject.attributes,
              }),
            })
          );
          expect(result._source).not.toHaveProperty('namespace'); // there should be no namespace/namespaces
          expect(result._source).not.toHaveProperty('namespaces');
        });

        it('handles multi namespace objects in an non-default space', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(defaultNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...multiNamespaceObject, namespace }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [
              expect.objectContaining({ ...multiNamespaceObject, namespaces: [namespace] }),
            ],
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana_analytics',
            id: `${multiNamespaceObject.type}:${multiNamespaceObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [multiNamespaceObject.type]: expect.objectContaining({
                ...multiNamespaceObject.attributes,
              }),
              namespaces: [namespace], // namespace has not changed
            })
          );
          expect(result._source).not.toHaveProperty('namespace');
        });

        it('handles multi namespace objects in the default space', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(defaultNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...multiDefaultNamespaceObject, namespace: defaultNamespace }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [
              expect.objectContaining({
                ...multiDefaultNamespaceObject,
                namespaces: [defaultNamespace],
              }),
            ],
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana_analytics',
            id: `${multiDefaultNamespaceObject.type}:${multiDefaultNamespaceObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [multiDefaultNamespaceObject.type]: expect.objectContaining({
                ...multiDefaultNamespaceObject.attributes,
              }),
              namespaces: [defaultNamespace], // namespace has not changed
            })
          );
          expect(result._source).not.toHaveProperty('namespace');
        });

        it('handles namespace agnostic objects', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(defaultNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...namespaceAgnosticObject, namespace }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [expect.objectContaining(namespaceAgnosticObject)], // no namespace/namespaces
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana',
            id: `${namespaceAgnosticObject.type}:${namespaceAgnosticObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [namespaceAgnosticObject.type]: expect.objectContaining({
                ...namespaceAgnosticObject.attributes,
              }),
            })
          );
          expect(result._source).not.toHaveProperty('namespace');
          expect(result._source).not.toHaveProperty('namespaces');
        });
      });

      describe('from a non-default space', () => {
        const singleNamespaceObject = {
          type: 'isolatedtype',
          id: 'space2-isolatedtype-id',
          attributes: {
            title: 'Updated title attribute!',
          },
        };

        const multiNamespaceObject = {
          type: 'index-pattern',
          id: 'space2-index-pattern-id',
          attributes: {
            title: 'Updated title attribute!',
          },
        };

        const currentNamespace = 'space_1';
        const namespace = 'space_2';

        it('handles single namespace objects in another non-default space', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(currentNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...singleNamespaceObject, namespace }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [
              expect.objectContaining({ ...singleNamespaceObject, namespaces: [namespace] }),
            ],
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana',
            id: `${namespace}:${singleNamespaceObject.type}:${singleNamespaceObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [singleNamespaceObject.type]: expect.objectContaining({
                ...singleNamespaceObject.attributes,
              }),
              namespace, // namespace has not changed
            })
          );
          expect(result._source).not.toHaveProperty('namespaces');
        });

        it('handles single namespace objects in the default space', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(currentNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...singleDefaultNamespaceObject, namespace: defaultNamespace }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [
              expect.objectContaining({
                ...singleDefaultNamespaceObject,
                namespaces: [defaultNamespace],
              }),
            ],
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana',
            id: `${singleDefaultNamespaceObject.type}:${singleDefaultNamespaceObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [singleDefaultNamespaceObject.type]: expect.objectContaining({
                ...singleDefaultNamespaceObject.attributes,
              }),
            })
          );
          expect(result._source).not.toHaveProperty('namespace'); // there should be no namespace/namespaces
          expect(result._source).not.toHaveProperty('namespaces');
        });

        it('handles multi namespace objects in another non-default space', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(currentNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...multiNamespaceObject, namespace }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [
              expect.objectContaining({ ...multiNamespaceObject, namespaces: [namespace] }),
            ],
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana_analytics',
            id: `${multiNamespaceObject.type}:${multiNamespaceObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [multiNamespaceObject.type]: expect.objectContaining({
                ...multiNamespaceObject.attributes,
              }),
              namespaces: [namespace], // namespace has not changed
            })
          );
          expect(result._source).not.toHaveProperty('namespace');
        });

        it('handles multi namespace objects in the default space', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(currentNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...multiDefaultNamespaceObject, namespace: defaultNamespace }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [
              expect.objectContaining({
                ...multiDefaultNamespaceObject,
                namespaces: [defaultNamespace],
              }),
            ],
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana_analytics',
            id: `${multiDefaultNamespaceObject.type}:${multiDefaultNamespaceObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [multiDefaultNamespaceObject.type]: expect.objectContaining({
                ...multiDefaultNamespaceObject.attributes,
              }),
              namespaces: [defaultNamespace], // namespace has not changed
            })
          );
          expect(result._source).not.toHaveProperty('namespace');
        });

        it('handles namespace agnostic objects', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(currentNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...namespaceAgnosticObject, namespace }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [expect.objectContaining(namespaceAgnosticObject)], // no namespace/namespaces
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana',
            id: `${namespaceAgnosticObject.type}:${namespaceAgnosticObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [namespaceAgnosticObject.type]: expect.objectContaining({
                ...namespaceAgnosticObject.attributes,
              }),
            })
          );
          expect(result._source).not.toHaveProperty('namespace');
          expect(result._source).not.toHaveProperty('namespaces');
        });
      });
    });

    describe('without object namespace override', () => {
      describe('from the default space', () => {
        it('handles single namespace objects in the default space', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(defaultNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...singleDefaultNamespaceObject }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [
              expect.objectContaining({
                ...singleDefaultNamespaceObject,
                namespaces: [defaultNamespace],
              }),
            ],
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana',
            id: `${singleDefaultNamespaceObject.type}:${singleDefaultNamespaceObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [singleDefaultNamespaceObject.type]: expect.objectContaining({
                ...singleDefaultNamespaceObject.attributes,
              }),
            })
          );
          expect(result._source).not.toHaveProperty('namespace'); // there should be no namespace/namespaces
          expect(result._source).not.toHaveProperty('namespaces');
        });

        it('handles multi namespace objects in the default space', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(defaultNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...multiDefaultNamespaceObject }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [
              expect.objectContaining({
                ...multiDefaultNamespaceObject,
                namespaces: [defaultNamespace],
              }),
            ],
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana_analytics',
            id: `${multiDefaultNamespaceObject.type}:${multiDefaultNamespaceObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [multiDefaultNamespaceObject.type]: expect.objectContaining({
                ...multiDefaultNamespaceObject.attributes,
              }),
              namespaces: [defaultNamespace], // namespace has not changed
            })
          );
          expect(result._source).not.toHaveProperty('namespace');
        });

        it('handles namespace agnostic objects', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(defaultNamespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...namespaceAgnosticObject }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [expect.objectContaining(namespaceAgnosticObject)], // no namespace/namespaces
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana',
            id: `${namespaceAgnosticObject.type}:${namespaceAgnosticObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [namespaceAgnosticObject.type]: expect.objectContaining({
                ...namespaceAgnosticObject.attributes,
              }),
            })
          );
          expect(result._source).not.toHaveProperty('namespace');
          expect(result._source).not.toHaveProperty('namespaces');
        });
      });

      describe('from a non-default space', () => {
        const singleNamespaceObject = {
          type: 'isolatedtype',
          id: 'space2-isolatedtype-id',
          attributes: {
            title: 'Updated title attribute!',
          },
        };

        const multiNamespaceObject = {
          type: 'index-pattern',
          id: 'space2-index-pattern-id',
          attributes: {
            title: 'Updated title attribute!',
          },
        };

        const namespace = 'space_2';

        it('handles single namespace objects in non-default space', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(namespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...singleNamespaceObject }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [
              expect.objectContaining({ ...singleNamespaceObject, namespaces: [namespace] }),
            ],
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana',
            id: `${namespace}:${singleNamespaceObject.type}:${singleNamespaceObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [singleNamespaceObject.type]: expect.objectContaining({
                ...singleNamespaceObject.attributes,
              }),
              namespace, // namespace has not changed
            })
          );
          expect(result._source).not.toHaveProperty('namespaces');
        });

        it('handles multi namespace objects in non-default space', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(namespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...multiNamespaceObject }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [
              expect.objectContaining({ ...multiNamespaceObject, namespaces: [namespace] }),
            ],
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana_analytics',
            id: `${multiNamespaceObject.type}:${multiNamespaceObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [multiNamespaceObject.type]: expect.objectContaining({
                ...multiNamespaceObject.attributes,
              }),
              namespaces: [namespace], // namespace has not changed
            })
          );
          expect(result._source).not.toHaveProperty('namespace');
        });

        it('handles namespace agnostic objects', async () => {
          const response = await supertest
            .put(`${getUrlPrefix(namespace)}/api/saved_objects/_bulk_update`)
            .send([{ ...namespaceAgnosticObject }])
            .expect(200);

          const savedObjects = JSON.parse(response.text);
          expect(savedObjects).toEqual({
            saved_objects: [expect.objectContaining(namespaceAgnosticObject)], // no namespace/namespaces
          });

          // Verify the raw document
          const result = await es.get({
            index: '.kibana',
            id: `${namespaceAgnosticObject.type}:${namespaceAgnosticObject.id}`,
          });

          expect(result.found).toBeTruthy();
          expect(result._source).toBeDefined();
          expect(result._source).toEqual(
            expect.objectContaining({
              [namespaceAgnosticObject.type]: expect.objectContaining({
                ...namespaceAgnosticObject.attributes,
              }),
            })
          );
          expect(result._source).not.toHaveProperty('namespace');
          expect(result._source).not.toHaveProperty('namespaces');
        });
      });
    });
  });
}
