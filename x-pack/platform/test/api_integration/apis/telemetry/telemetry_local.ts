/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import deepmerge from 'deepmerge';
import ossRootTelemetrySchema from '@kbn/telemetry-plugin/schema/oss_root.json';
import ossPluginsTelemetrySchema from '@kbn/telemetry-plugin/schema/oss_plugins.json';
import ossPlatformTelemetrySchema from '@kbn/telemetry-plugin/schema/oss_platform.json';
import ossPackagesTelemetrySchema from '@kbn/telemetry-plugin/schema/kbn_packages.json';
import xpackRootTelemetrySchema from '@kbn/telemetry-collection-xpack-plugin/schema/xpack_root.json';
import xpackPluginsTelemetrySchema from '@kbn/telemetry-collection-xpack-plugin/schema/xpack_plugins.json';
import xpackPlatformTelemetrySchema from '@kbn/telemetry-collection-xpack-plugin/schema/xpack_platform.json';
// BOOKMARK - List of Kibana Solutions
import xpackObservabilityTelemetrySchema from '@kbn/telemetry-collection-xpack-plugin/schema/xpack_observability.json';
import xpackSearchTelemetrySchema from '@kbn/telemetry-collection-xpack-plugin/schema/xpack_search.json';
import xpackSecurityTelemetrySchema from '@kbn/telemetry-collection-xpack-plugin/schema/xpack_security.json';
import xpackChatTelemetrySchema from '@kbn/telemetry-collection-xpack-plugin/schema/xpack_chat.json';
import { assertTelemetryPayload } from '@kbn/telemetry-tools';
import type { TelemetrySchemaObject } from '@kbn/telemetry-tools/src/schema_ftr_validations/schema_to_config_schema';
import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { flatKeys } from '@kbn/test-suites-src/api_integration/apis/telemetry/utils';
import type { FtrProviderContext } from '../../ftr_provider_context';

const disableCollection = {
  persistent: {
    xpack: {
      monitoring: {
        collection: {
          enabled: false,
        },
      },
    },
  },
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('/internal/telemetry/clusters/_stats with monitoring disabled', () => {
    let stats: Record<string, any>;

    before('disable monitoring and pull local stats', async () => {
      await es.cluster.putSettings(disableCollection);
      await new Promise((r) => setTimeout(r, 1000));

      const { body } = await supertest
        .post('/internal/telemetry/clusters/_stats')
        .set('kbn-xsrf', 'xxx')
        .set(ELASTIC_HTTP_VERSION_HEADER, '2')
        .set(X_ELASTIC_INTERNAL_ORIGIN_REQUEST, 'kibana')
        .send({ unencrypted: true, refreshCache: true })
        .expect(200);

      expect(body.length).to.be(1);
      stats = body[0].stats;
    });

    it('should pass the schema validation', () => {
      const root = deepmerge(ossRootTelemetrySchema, xpackRootTelemetrySchema);

      const schemas = [
        ossPluginsTelemetrySchema,
        ossPackagesTelemetrySchema,
        ossPlatformTelemetrySchema,
        xpackPluginsTelemetrySchema,
        xpackPlatformTelemetrySchema,
        xpackObservabilityTelemetrySchema,
        xpackSearchTelemetrySchema,
        xpackSecurityTelemetrySchema,
        xpackChatTelemetrySchema,
      ] as TelemetrySchemaObject[];
      const plugins = schemas.reduce((acc, schema) => deepmerge(acc, schema));

      try {
        assertTelemetryPayload({ root, plugins }, stats);
      } catch (err) {
        err.message = `The telemetry schemas in are out-of-date. Please define the schema of your collector and run "node scripts/telemetry_check --fix" to update them: ${err.message}`;
        throw err;
      }
    });

    it('should pass ad-hoc enforced validations', () => {
      expect(stats.collection).to.be('local');
      expect(stats.collectionSource).to.be('local_xpack');

      // License should exist in X-Pack
      expect(stats.license.issuer).to.be.a('string');
      expect(stats.license.status).to.be('active');

      expect(stats.stack_stats.kibana.count).to.be(1);
      expect(stats.stack_stats.kibana.indices).to.be(1);

      expect(stats.stack_stats.kibana.dashboard.total).to.be.a('number');
      expect(stats.stack_stats.kibana.graph_workspace.total).to.be.a('number');
      expect(stats.stack_stats.kibana.index_pattern.total).to.be.a('number');
      expect(stats.stack_stats.kibana.search.total).to.be.a('number');
      expect(stats.stack_stats.kibana.visualization.total).to.be.a('number');

      expect(stats.stack_stats.kibana.plugins.apm.services_per_agent).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.infraops.last_24_hours).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.kql.defaultQueryLanguage).to.be.a('string');
      expect(stats.stack_stats.kibana.plugins.maps.timeCaptured).to.be.a('string');
      expect(stats.stack_stats.kibana.plugins.maps.attributes).to.be(undefined);
      expect(stats.stack_stats.kibana.plugins.maps.id).to.be(undefined);
      expect(stats.stack_stats.kibana.plugins.maps.type).to.be(undefined);

      // Saved Objects Count collector
      expect(stats.stack_stats.kibana.plugins.saved_objects_counts.total).to.be.a('number');
      expect(stats.stack_stats.kibana.plugins.saved_objects_counts.total).to.be.greaterThan(0); // At least the `config` document should be there
      expect(stats.stack_stats.kibana.plugins.saved_objects_counts.by_type).to.be.an('array');
      expect(
        stats.stack_stats.kibana.plugins.saved_objects_counts.by_type.length
      ).to.be.greaterThan(0); // At least the `config` document should be there
      expect(
        stats.stack_stats.kibana.plugins.saved_objects_counts.by_type.find(
          ({ type }: { type: string }) => type === 'config'
        )
      ).to.eql({ type: 'config', count: 1 });
      expect(stats.stack_stats.kibana.plugins.saved_objects_counts.others).to.be(0); // Unless there's a bug/unexpected situation, it should be 0
      expect(stats.stack_stats.kibana.plugins.saved_objects_counts.non_registered_types).to.eql([]); // During tests, we shouldn't expect to list types that are not registered.

      expect(stats.stack_stats.kibana.plugins.reporting.enabled).to.be(true);
      expect(stats.stack_stats.kibana.plugins.rollups.index_patterns).to.be.an('object');
      expect(stats.stack_stats.kibana.plugins.spaces.available).to.be(true);
      expect(stats.stack_stats.kibana.plugins.fileUpload.file_upload.index_creation_count).to.be.a(
        'number'
      );

      expect(stats.stack_stats.kibana.os.platforms[0].platform).to.be.a('string');
      expect(stats.stack_stats.kibana.os.platforms[0].count).to.be(1);
      expect(stats.stack_stats.kibana.os.platformReleases[0].platformRelease).to.be.a('string');
      expect(stats.stack_stats.kibana.os.platformReleases[0].count).to.be(1);

      expect(stats.stack_stats.xpack.graph).to.be.an('object');
      expect(stats.stack_stats.xpack.transform).to.be.an('object');
      expect(stats.stack_stats.xpack.transform.available).to.be.an('boolean');
      expect(stats.stack_stats.xpack.transform.enabled).to.be.an('boolean');
      expect(stats.stack_stats.xpack.ilm).to.be.an('object');
      expect(stats.stack_stats.xpack.logstash).to.be.an('object');
      expect(stats.stack_stats.xpack.ml).to.be.an('object');
      expect(stats.stack_stats.xpack.monitoring).to.be.an('object');
      expect(stats.stack_stats.xpack.rollup).to.be.an('object');
    });

    it('should validate mandatory fields exist', () => {
      const actual = flatKeys(stats);

      const expected = [
        'cluster_name',
        'cluster_stats.cluster_uuid',
        'cluster_stats.indices.completion',
        'cluster_stats.indices.count',
        'cluster_stats.indices.docs',
        'cluster_stats.indices.fielddata',
        'cluster_stats.indices.query_cache',
        'cluster_stats.indices.segments',
        'cluster_stats.indices.shards',
        'cluster_stats.indices.store',
        'cluster_stats.nodes.count',
        'cluster_stats.nodes.discovery_types',
        'cluster_stats.nodes.fs',
        'cluster_stats.nodes.jvm',
        'cluster_stats.nodes.network_types',
        'cluster_stats.nodes.os',
        'cluster_stats.nodes.plugins',
        'cluster_stats.nodes.process',
        'cluster_stats.nodes.versions',
        'cluster_stats.status',
        'cluster_stats.timestamp',
        'cluster_uuid',
        'collection',
        'license.expiry_date',
        'license.expiry_date_in_millis',
        'license.issue_date',
        'license.issue_date_in_millis',
        'license.issued_to',
        'license.issuer',
        'license.max_nodes',
        'license.start_date_in_millis',
        'license.status',
        'license.type',
        'license.uid',
        'stack_stats.kibana.count',
        'stack_stats.kibana.dashboard',
        'stack_stats.kibana.graph_workspace',
        'stack_stats.kibana.index_pattern',
        'stack_stats.kibana.indices',
        'stack_stats.kibana.os',
        'stack_stats.kibana.plugins',
        'stack_stats.kibana.search',
        'stack_stats.kibana.versions',
        'stack_stats.kibana.visualization',
        'stack_stats.xpack.ccr',
        'stack_stats.xpack.transform',
        'stack_stats.xpack.graph',
        'stack_stats.xpack.ilm',
        'stack_stats.xpack.logstash',
        'stack_stats.xpack.ml',
        'stack_stats.xpack.monitoring',
        'stack_stats.xpack.rollup',
        'stack_stats.xpack.security',
        'stack_stats.xpack.sql',
        'stack_stats.xpack.watcher',
        'timestamp',
        'version',
      ];

      expect(expected.every((m) => actual.includes(m))).to.be.ok();
    });

    it('should include core saved objects indices usage stats', () => {
      const indices = stats.stack_stats.kibana.plugins.core.services.savedObjects.indices;

      expect(indices).to.be.an('array');
      expect(indices.length).to.be.greaterThan(0);

      const kibanaIndex = indices.find(({ alias }: { alias: string }) => alias === '.kibana');
      const taskManagerIndex = indices.find(
        ({ alias }: { alias: string }) => alias === '.kibana_task_manager'
      );

      expect(kibanaIndex).to.be.an('object');
      expect(taskManagerIndex).to.be.an('object');

      [kibanaIndex, taskManagerIndex].forEach((index) => {
        expect(index.docsCount).to.be.a('number');
        expect(index.docsCount).to.be.greaterThan(-1);
        expect(index.docsDeleted).to.be.a('number');
        expect(index.docsDeleted).to.be.greaterThan(-1);
        expect(index.storeSizeBytes).to.be.a('number');
        expect(index.storeSizeBytes).to.be.greaterThan(-1);
        expect(index.primaryStoreSizeBytes).to.be.a('number');
        expect(index.primaryStoreSizeBytes).to.be.greaterThan(-1);
        expect(index.savedObjectsDocsCount).to.be.a('number');
        expect(index.savedObjectsDocsCount).to.be.greaterThan(-1);
      });
    });
  });
}
