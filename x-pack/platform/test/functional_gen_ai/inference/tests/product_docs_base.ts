/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import type SuperTest from 'supertest';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import type { FtrProviderContext } from '../ftr_provider_context';

const getProductDocStatus = async (supertest: SuperTest.Agent, inferenceId: string) => {
  return supertest
    .get('/internal/product_doc_base/status?inferenceId=' + inferenceId)
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .set('kbn-xsrf', 'foo')
    .expect(200);
};
const installProductDoc = async (supertest: SuperTest.Agent, inferenceId: string) => {
  return supertest
    .post('/internal/product_doc_base/install')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .set('kbn-xsrf', 'foo')
    .send({
      inferenceId,
    })
    .expect(200);
};

const uninstallProductDoc = async (supertest: SuperTest.Agent, inferenceId: string) => {
  return supertest
    .post('/internal/product_doc_base/uninstall')
    .set(ELASTIC_HTTP_VERSION_HEADER, '1')
    .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
    .set('kbn-xsrf', 'foo')
    .send({
      inferenceId,
    })
    .expect(200);
};
const products = ['kibana', 'security', 'observability', 'elasticsearch'] as const;
type DocumentationProduct = (typeof products)[number];

const getIndexName = (productName: string, optionalInferenceId?: string) => {
  let indexName = `.kibana_ai_product_doc_${productName}`;
  if (optionalInferenceId) {
    indexName += `-${optionalInferenceId}`;
  }
  return indexName;
};

export const productDocsBaseInstallationSuite = ({}: {}, { getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');

  const deleteProductDocIndex = async ({
    productName,
    optionalInferenceId,
  }: {
    productName: string;
    optionalInferenceId?: string;
  }) => {
    const indexName = getIndexName(productName, optionalInferenceId);
    const deletedIndices = await es.indices.delete(
      {
        index: indexName,
      },
      { ignore: [404] }
    );
    return deletedIndices;
  };

  const assertProducDocIndex = async ({
    productName,
    shouldExist,
    optionalInferenceId,
  }: {
    productName: string;
    shouldExist: boolean;
    optionalInferenceId?: string;
  }) => {
    const indexName = getIndexName(productName, optionalInferenceId);
    await retry.waitForWithTimeout(
      `Elasticsearch index [${indexName}] should ${shouldExist ? 'exist' : 'not exist'}`,
      240 * 1000,
      async () => {
        if ((await es.indices.exists({ index: indexName })) === shouldExist) {
          return true;
        } else {
          throw new Error(
            `Expected Elasticsearch index '[${indexName}]' ${
              shouldExist ? 'to exist' : 'not to exist'
            }.`
          );
        }
      }
    );
  };

  describe('product docs base', () => {
    const cleanUp = async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await Promise.all(products.map((product) => deleteProductDocIndex({ productName: product })));
      await Promise.all(
        products.map((product) =>
          deleteProductDocIndex({
            productName: product,
            optionalInferenceId: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
          })
        )
      );
    };
    before(async () => {
      await cleanUp();
    });
    after(async () => {
      await cleanUp();
    });

    it('installs the ELSER product docs', async () => {
      const elserProductDocs = await installProductDoc(supertest, defaultInferenceEndpoints.ELSER);
      expect(elserProductDocs.status).to.be(200);
      expect(elserProductDocs.body.installed).to.be(true);

      const statusResponse = await getProductDocStatus(supertest, defaultInferenceEndpoints.ELSER);
      const statusBody = statusResponse.body;
      expect(statusBody.overall).to.eql(
        'installed',
        `Expected overall product doc installation status to be 'installed', got ${JSON.stringify(
          statusBody,
          null,
          2
        )}`
      );
    });

    it('installs the E5 product docs', async () => {
      const e5ProductDocs = await installProductDoc(
        supertest,
        defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL
      );
      expect(e5ProductDocs.status).to.be(200);
      expect(e5ProductDocs.body.installed).to.be(true);

      const statusResponse = await getProductDocStatus(
        supertest,
        defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL
      );
      const statusBody = statusResponse.body;
      expect(statusBody.overall).to.eql(
        'installed',
        `Expected overall product doc installation status to be 'installed', got ${JSON.stringify(
          statusBody,
          null,
          2
        )}`
      );
      expect(statusBody.inferenceId).to.be(defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL);
      products.forEach((product) => {
        expect(statusBody.perProducts[product as DocumentationProduct].status).to.eql(
          'installed',
          `Expected product doc installation status for [${product}] to be installed, got ${JSON.stringify(
            statusBody.perProducts[product as DocumentationProduct],
            null,
            2
          )}`
        );
      });
      for (const product of products) {
        await assertProducDocIndex({
          productName: product,
          shouldExist: true,
          optionalInferenceId: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
        });
      }
    });
    it('updates the product docs for all previously installed Inference IDs if inferenceIds is ommited', async () => {
      const updatedResponse = await supertest
        .post('/internal/product_doc_base/update_all')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          forceUpdate: false,
        })
        .set('kbn-xsrf', 'foo')
        .expect(200);
      const updatedBody = updatedResponse.body;
      expect(updatedBody[defaultInferenceEndpoints.ELSER].installed).to.be(true);
      expect(updatedBody[defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL].installed).to.be(true);
    });

    it('updates the product docs the specific inferenceId', async () => {
      const updatedResponse = await supertest
        .post('/internal/product_doc_base/update_all')
        .set(ELASTIC_HTTP_VERSION_HEADER, '1')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({
          forceUpdate: true,
          inferenceIds: [defaultInferenceEndpoints.ELSER],
        })
        .set('kbn-xsrf', 'foo')
        .expect(200);
      const updatedBody = updatedResponse.body;
      expect(updatedBody[defaultInferenceEndpoints.ELSER].installed).to.be(true);
      expect(updatedBody[defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL]).to.be(undefined);
    });

    it('uninstalls the E5 product docs', async () => {
      const uninstalledResponse = await uninstallProductDoc(
        supertest,
        defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL
      );

      expect(uninstalledResponse.status).to.be(200);

      const statusResponse = await getProductDocStatus(
        supertest,
        defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL
      );
      const statusBody = statusResponse.body;
      expect(statusBody.overall).to.eql(
        'uninstalled',
        `Expected overall product doc installation status to be 'uninstalled', got ${JSON.stringify(
          statusBody,
          null,
          2
        )}`
      );
      expect(statusBody.inferenceId).to.be(defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL);
      products.forEach((product) => {
        expect(statusBody.perProducts[product as DocumentationProduct].status).to.eql(
          'uninstalled',
          `Expected product doc installation status for [${product}] to be 'uninstalled', got ${JSON.stringify(
            statusBody.perProducts[product as DocumentationProduct],
            null,
            2
          )}`
        );
      });
      await assertProducDocIndex({
        productName: 'kibana',
        shouldExist: false,
        optionalInferenceId: defaultInferenceEndpoints.MULTILINGUAL_E5_SMALL,
      });
    });
    it('stills retains the other installed product docs', async () => {
      const statusResponse = await getProductDocStatus(supertest, defaultInferenceEndpoints.ELSER);
      const statusBody = statusResponse.body;
      expect(statusBody.overall).to.eql(
        'installed',
        `Expected overall product doc installation status for inferenceId [${
          defaultInferenceEndpoints.ELSER
        }] to be 'installed', got ${JSON.stringify(statusBody, null, 2)}`
      );
      expect(statusBody.inferenceId).to.be(defaultInferenceEndpoints.ELSER);
      products.forEach((product) => {
        expect(statusBody.perProducts[product as DocumentationProduct].status).to.eql(
          'installed',
          `Expected product doc installation status for inferenceId [${
            defaultInferenceEndpoints.ELSER
          }] for [${product}] to be 'installed', got ${JSON.stringify(
            statusBody.perProducts[product as DocumentationProduct],
            null,
            2
          )}`
        );
      });
    });
  });
};
