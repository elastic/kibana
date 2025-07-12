/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const esClient = getService('es');
  const retry = getService('retry');

  describe('analytics indexes creation', () => {
    const indexVersion = 1;

    it.skip('cases index should be created with the correct mappings and scripts on startup', async () => {
      const indexName = '.internal.cases';
      const painlessScriptId = 'cai_cases_script_1';
      const version = indexVersion;

      await retry.tryForTime(300000, async () => {
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
      const indexName = '.internal.cases-activity';
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
      const indexName = '.internal.cases-attachments';
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
      const indexName = '.internal.cases-comments';
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
