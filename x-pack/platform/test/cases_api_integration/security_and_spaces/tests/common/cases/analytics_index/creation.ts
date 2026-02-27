/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { join } from 'path';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import {
  createConfiguration,
  deleteConfiguration,
  getConfigurationRequest,
} from '../../../../../common/lib/api';
import { runSchedulerTask } from '../../../../../common/lib/api/analytics';

export default ({ getService }: FtrProviderContext): void => {
  const esClient = getService('es');
  const retry = getService('retry');
  const supertestService = getService('supertest');

  describe('analytics indexes creation', () => {
    const indexVersion = 1;

    before(async () => {
      // Enable analytics for the securitySolutionFixture owner in the default space.
      // The scheduler only processes spaces that have opted in via analytics_enabled=true.
      await createConfiguration(
        supertestService,
        getConfigurationRequest({ overrides: { analytics_enabled: true } })
      );

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

    after(async () => {
      await deleteConfiguration(esClient);
    });

    it('content index (cases + comments + attachments) should be created with correct mappings and scripts', async () => {
      // Internal destination: .internal.cases-analytics.{owner}-{spaceId}
      const indexName = '.internal.cases-analytics.securitysolutionfixture-default';
      const painlessScriptId = 'cai_content_script_1';

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

      expect(mappingDict[indexName].mappings._meta?.mapping_version).to.be(indexVersion);
      expect(mappingDict[indexName].mappings._meta?.painless_script_id).to.be(painlessScriptId);

      const painlessScript = await esClient.getScript({
        id: painlessScriptId,
      });

      expect(painlessScript.found).to.be(true);
    });

    it('activity index should be created with the correct mappings and scripts', async () => {
      // Internal destination: .internal.cases-analytics-activity.{owner}-{spaceId}
      const indexName = '.internal.cases-analytics-activity.securitysolutionfixture-default';
      const painlessScriptId = 'cai_activity_script_1';

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

      expect(mappingDict[indexName].mappings._meta?.mapping_version).to.be(indexVersion);
      expect(mappingDict[indexName].mappings._meta?.painless_script_id).to.be(painlessScriptId);

      const painlessScript = await esClient.getScript({
        id: painlessScriptId,
      });

      expect(painlessScript.found).to.be(true);
    });
  });
};
