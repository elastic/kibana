/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { join } from 'path';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { runSchedulerTask } from '../../../../../common/lib/api/analytics';

export default ({ getService }: FtrProviderContext): void => {
  const esClient = getService('es');
  const retry = getService('retry');
  const supertestService = getService('supertest');

  describe('analytics indexes creation', () => {
    const indexVersion = 1;
    before(async () => {
      await supertestService
        .post('/api/saved_objects/_import')
        .query({ overwrite: true })
        .attach(
          'file',
          join(
            __dirname,
            '../../../../../common/fixtures/saved_object_exports/single_case_user_actions_one_comment.ndjson'
          )
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      await supertestService
        .post('/api/saved_objects/_import')
        .query({ overwrite: true })
        .attach(
          'file',
          join(
            __dirname,
            '../../../../../common/fixtures/saved_object_exports/single_case_with_connector_update_to_none.ndjson'
          )
        )
        .set('kbn-xsrf', 'true')
        .expect(200);

      await runSchedulerTask(supertestService);
    });

    it('cases index should be created with the correct mappings and scripts on startup', async () => {
      const indexName = '.internal.cases.default-securitysolution';
      const painlessScriptId = 'cai_cases_script_1';
      const version = indexVersion;

      await retry.try(async () => {
        expect(
          await esClient.indices.exists({
            index: indexName,
          })
        ).to.be(true);
      });

      const mappingDict = await esClient.indices.getMapping({
        index: indexName,
      });

      expect(mappingDict[indexName].mappings._meta?.mapping_version).to.be(version);
      expect(mappingDict[indexName].mappings._meta?.painless_script_id).to.be(painlessScriptId);

      const painlessScript = await esClient.getScript({
        id: painlessScriptId,
      });

      expect(painlessScript.found).to.be(true);
    });

    it('activity index should be created with the correct mappings and scripts on startup', async () => {
      const indexName = '.internal.cases-activity.default-securitysolution';
      const painlessScriptId = 'cai_activity_script_1';
      const version = indexVersion;

      await retry.try(async () => {
        expect(
          await esClient.indices.exists({
            index: indexName,
          })
        ).to.be(true);
      });

      const mappingDict = await esClient.indices.getMapping({
        index: indexName,
      });

      expect(mappingDict[indexName].mappings._meta?.mapping_version).to.be(version);
      expect(mappingDict[indexName].mappings._meta?.painless_script_id).to.be(painlessScriptId);

      const painlessScript = await esClient.getScript({
        id: painlessScriptId,
      });

      expect(painlessScript.found).to.be(true);
    });

    it('attachments index should be created with the correct mappings and scripts on startup', async () => {
      const indexName = '.internal.cases-attachments.default-securitysolution';
      const painlessScriptId = 'cai_attachments_script_1';
      const version = indexVersion;

      await retry.try(async () => {
        expect(
          await esClient.indices.exists({
            index: indexName,
          })
        ).to.be(true);
      });

      const mappingDict = await esClient.indices.getMapping({
        index: indexName,
      });

      expect(mappingDict[indexName].mappings._meta?.mapping_version).to.be(version);
      expect(mappingDict[indexName].mappings._meta?.painless_script_id).to.be(painlessScriptId);

      const painlessScript = await esClient.getScript({
        id: painlessScriptId,
      });

      expect(painlessScript.found).to.be(true);
    });

    it('comments index should be created with the correct mappings and scripts on startup', async () => {
      const indexName = '.internal.cases-comments.default-securitysolution';
      const painlessScriptId = 'cai_comments_script_1';
      const version = indexVersion;

      await retry.try(async () => {
        expect(
          await esClient.indices.exists({
            index: indexName,
          })
        ).to.be(true);
      });

      const mappingDict = await esClient.indices.getMapping({
        index: indexName,
      });

      expect(mappingDict[indexName].mappings._meta?.mapping_version).to.be(version);
      expect(mappingDict[indexName].mappings._meta?.painless_script_id).to.be(painlessScriptId);

      const painlessScript = await esClient.getScript({
        id: painlessScriptId,
      });

      expect(painlessScript.found).to.be(true);
    });
  });
};
