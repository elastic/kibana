/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { join } from 'path';
import { SECURITY_SOLUTION_OWNER } from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../../../../common/ftr_provider_context';
import { runSchedulerTask } from '../../../../../common/lib/api/analytics';
import {
  createConfiguration,
  deleteConfiguration,
  getConfigurationRequest,
} from '../../../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const esClient = getService('es');
  const retry = getService('retry');
  const supertestService = getService('supertest');

  describe('analytics indexes creation', () => {
    const indexVersion = 1;
    before(async () => {
      // Enable analytics for the default space so the scheduler task creates indexes.
      // Must use a real owner (SECURITY_SOLUTION_OWNER) so that
      // getSpacesWithAnalyticsEnabled includes it (it filters by OWNERS).
      await createConfiguration(
        supertestService,
        getConfigurationRequest({
          overrides: { analytics_enabled: true, owner: SECURITY_SOLUTION_OWNER },
        })
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

    it('content index should be created with the correct mappings and scripts on startup', async () => {
      const indexName = '.internal.cases-analytics.securitysolution-default';
      const painlessScriptId = 'cai_content_script_1';
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

    it('content index should have extended_fields as a dynamic object with typed dynamic_templates', async () => {
      const indexName = '.internal.cases-analytics.securitysolution-default';

      await retry.try(async () => {
        expect(await esClient.indices.exists({ index: indexName })).to.be(true);
      });

      const mappingDict = await esClient.indices.getMapping({ index: indexName });
      const mapping = mappingDict[indexName].mappings;

      // extended_fields should be an object with dynamic: true
      const extendedFieldsProp = (mapping.properties as Record<string, unknown>)
        ?.extended_fields as Record<string, unknown>;
      expect(extendedFieldsProp).to.be.ok();
      expect(extendedFieldsProp.type).to.be('object');
      expect(extendedFieldsProp.dynamic).to.be(true);

      // dynamic_templates should exist at the root mapping with all supported type suffixes
      const dynamicTemplates = mapping.dynamic_templates as Array<Record<string, unknown>>;
      expect(dynamicTemplates).to.be.ok();
      expect(dynamicTemplates.length).to.be.greaterThan(0);

      const templateNames = dynamicTemplates.map((t) => Object.keys(t)[0]);
      expect(templateNames).to.contain('ef_keyword');
      expect(templateNames).to.contain('ef_text');
      expect(templateNames).to.contain('ef_long');
      expect(templateNames).to.contain('ef_double');
      expect(templateNames).to.contain('ef_date');
      expect(templateNames).to.contain('ef_boolean');
      expect(templateNames).to.contain('ef_ip');
      expect(templateNames).to.contain('ef_date_range');

      // spot-check: ef_long should match extended_fields.*_as_long and map to long type
      const longTemplate = dynamicTemplates.find((t) => Object.keys(t)[0] === 'ef_long')!;
      const longConfig = Object.values(longTemplate)[0] as {
        path_match: string;
        mapping: { type: string };
      };
      expect(longConfig.path_match).to.be('extended_fields.*_as_long');
      expect(longConfig.mapping.type).to.be('long');
    });

    it('activity index should be created with the correct mappings and scripts on startup', async () => {
      const indexName = '.internal.cases-analytics-activity.securitysolution-default';
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
  });
};
