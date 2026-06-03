/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type {
  IndicesPutIndexTemplateRequest,
  IndicesGetIndexTemplateIndexTemplateItem,
} from '@elastic/elasticsearch/lib/api/types';
import { type Client as ElasticsearchClient } from '@elastic/elasticsearch';
import {
  REPORTING_DATA_STREAM_ALIAS,
  REPORTING_DATA_STREAM_INDEX_TEMPLATE,
  REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD,
} from '@kbn/reporting-server';
import type { Agent as Superagent } from 'superagent';
import { set } from '@kbn/safer-lodash-set';
import { cloneDeep } from 'lodash';

import { URI_ROLLOVER } from '@kbn/reporting-test-routes/server/routes';
import type { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esClient: ElasticsearchClient = getService('es');
  const supertest: Superagent = getService('supertest');
  let originalIndexTemplate: IndicesPutIndexTemplateRequest;

  describe('Roll reporting data stream at startup', () => {
    before(async () => {
      originalIndexTemplate = await getOriginalIndexTemplate(esClient);
    });
    beforeEach(async () => {
      await updateIndexTemplate(esClient, originalIndexTemplate);
      await deleteDataStream(esClient);
    });
    afterEach(async () => {
      await updateIndexTemplate(esClient, originalIndexTemplate);
      await deleteDataStream(esClient);
    });

    it('should not roll the data stream if not yet created', async () => {
      const rolled = await rollDataStreamIfRequired(supertest);
      expect(rolled).to.be(false);
    });

    it('should not roll the data stream if it matches the template', async () => {
      await writeToDataStream(esClient);

      const templateVersion = await getMaxTemplateVersion(esClient);
      const mappingVersion = await getMaxMappingVersion(esClient);
      expect(mappingVersion).to.be(templateVersion);

      const rolled = await rollDataStreamIfRequired(supertest);
      expect(rolled).to.be(false);
    });

    it('should roll the data stream if it does not match the template', async () => {
      await writeToDataStream(esClient);

      const oldTemplateVersion = await getMaxTemplateVersion(esClient);
      const oldMappingVersion = await getMaxMappingVersion(esClient);

      // upgrade the template version
      const updatedTemplate = upgradeTemplateVersion(originalIndexTemplate);
      await updateIndexTemplate(esClient, updatedTemplate);

      const rolled = await rollDataStreamIfRequired(supertest);
      expect(rolled).to.be(true);

      // with lazy rollover, mapping version won't be updated yet
      const newTemplateVersion = await getMaxTemplateVersion(esClient);
      const newMappingVersion = await getMaxMappingVersion(esClient);
      expect(newTemplateVersion).to.be(oldTemplateVersion + 1);
      expect(newMappingVersion).to.be(oldMappingVersion);
      expect(newMappingVersion).not.to.be(newTemplateVersion);

      // it will get rolled when we write to it
      await writeToDataStream(esClient);
      const newerMappingVersion = await getMaxMappingVersion(esClient);
      expect(newerMappingVersion).to.be(newTemplateVersion);
    });

    it('should not roll the data stream if it was just rolled', async () => {
      await writeToDataStream(esClient);

      // upgrade the template version
      const updatedTemplate = upgradeTemplateVersion(originalIndexTemplate);
      await updateIndexTemplate(esClient, updatedTemplate);

      const rolled = await rollDataStreamIfRequired(supertest);
      expect(rolled).to.be(true);

      await writeToDataStream(esClient);

      const rolled2 = await rollDataStreamIfRequired(supertest);
      expect(rolled2).to.be(false);
    });
  });
}

function upgradeTemplateVersion(originalIndexTemplate: IndicesPutIndexTemplateRequest) {
  expect(originalIndexTemplate.version).to.be.a('number');
  const newVersion = originalIndexTemplate.version! + 1;

  const updatedTemplate = cloneDeep(originalIndexTemplate);
  updatedTemplate.version = newVersion;
  const meta = { [REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD]: newVersion };
  set(updatedTemplate, 'template.mappings._meta', meta);
  expect(
    updatedTemplate.template?.mappings?._meta?.[REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD]
  ).to.eql(updatedTemplate.version);

  return updatedTemplate;
}

async function getOriginalIndexTemplate(esClient: ElasticsearchClient) {
  const gotOriginalIndexTemplate = await getIndexTemplate(esClient);
  const { name, index_template: indexTemplate } = gotOriginalIndexTemplate;
  const originalIndexTemplate = {
    name,
    create: false,
    index_patterns: indexTemplate.index_patterns,
    composed_of: indexTemplate.composed_of,
    template: indexTemplate.template,
    data_stream: indexTemplate.data_stream,
    priority: indexTemplate.priority,
    version: indexTemplate.version,
    _meta: indexTemplate._meta,
    allow_auto_create: indexTemplate.allow_auto_create,
    deprecated: indexTemplate.deprecated,
  };
  return originalIndexTemplate;
}

async function rollDataStreamIfRequired(supertest: Superagent) {
  const res = await supertest.post(URI_ROLLOVER).set('kbn-xsrf', 'foo').send({});
  expect(res.status).to.eql(200);
  const { result } = res.body;
  if (typeof result !== 'boolean') {
    throw new Error(`Unexpected result from ${URI_ROLLOVER}: ${JSON.stringify(res.body)}`);
  }
  return result;
}

async function dataStreamExists(esClient: ElasticsearchClient) {
  return await esClient.indices.exists({
    index: REPORTING_DATA_STREAM_ALIAS,
    expand_wildcards: 'all',
  });
}

async function writeToDataStream(esClient: ElasticsearchClient) {
  const document = { '@timestamp': new Date().toISOString() };
  const result = await esClient.index({
    index: REPORTING_DATA_STREAM_ALIAS,
    document,
    refresh: true,
  });
  expect(result.result).to.be('created');
  expect(await dataStreamExists(esClient)).to.be(true);
}

async function deleteDataStream(esClient: ElasticsearchClient) {
  if (!(await dataStreamExists(esClient))) return;

  const result = await esClient.indices.deleteDataStream({
    name: REPORTING_DATA_STREAM_ALIAS,
    expand_wildcards: 'all',
  });

  // @ts-ignore ; I've seen either result.acknowledged or result.status === 404
  expect(result.acknowledged || result.status === 404).to.be(true);
  expect(await dataStreamExists(esClient)).to.be(false);
}

async function updateIndexTemplate(
  esClient: ElasticsearchClient,
  template: IndicesPutIndexTemplateRequest
) {
  const result = await esClient.indices.putIndexTemplate(template);
  expect(result.acknowledged).to.be(true);

  const newTemplateVersion = await getMaxTemplateVersion(esClient);
  expect(newTemplateVersion).to.be(template.version);
}

async function getIndexTemplate(
  esClient: ElasticsearchClient
): Promise<IndicesGetIndexTemplateIndexTemplateItem> {
  const res = await esClient.indices.getIndexTemplate({
    name: REPORTING_DATA_STREAM_INDEX_TEMPLATE,
  });

  expect(res.index_templates.length).to.be(1);
  return res.index_templates[0];
}

async function getMaxMappingVersion(esClient: ElasticsearchClient) {
  if (!(await dataStreamExists(esClient))) return;

  const mappingsRecord = await esClient.indices.getMapping({
    index: REPORTING_DATA_STREAM_ALIAS,
    expand_wildcards: 'all',
    allow_no_indices: true,
  });
  const mappingsArray = Object.values(mappingsRecord);

  // ensure the _meta field is set on the mappings
  const mappingVersions: number[] = mappingsArray.map(
    (m) => m.mappings._meta?.[REPORTING_INDEX_TEMPLATE_MAPPING_META_FIELD]
  );
  const mappingVersion = Math.max(...mappingVersions);
  return mappingVersion;
}

async function getMaxTemplateVersion(esClient: ElasticsearchClient) {
  const gotTemplate = await esClient.indices.getIndexTemplate({
    name: REPORTING_DATA_STREAM_INDEX_TEMPLATE,
  });
  expect(gotTemplate.index_templates.length).to.be.greaterThan(0);

  const templateVersions: number[] = [];
  for (const template of gotTemplate.index_templates) {
    const templateVersion = template.index_template.version;
    if (templateVersion) templateVersions.push(templateVersion);
  }
  expect(templateVersions.length).to.be.greaterThan(0);

  // assume the highest version is the one in use
  const templateVersion = Math.max(...templateVersions);
  return templateVersion;
}
