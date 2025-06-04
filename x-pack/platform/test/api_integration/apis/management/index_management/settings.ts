/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { indicesHelpers } from './lib/indices.helpers';
import { settingsApi } from './lib/settings.api';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const { createIndex, deleteAllIndices } = indicesHelpers(getService);
  const { getIndexSettings, updateIndexSettings } = settingsApi(getService);

  describe('settings', () => {
    after(async () => await deleteAllIndices());

    it('should fetch an index settings', async () => {
      const index = await createIndex();

      const { status, body } = await getIndexSettings(index);
      expect(status).to.eql(200);

      // Verify we fetch the corret index settings
      expect(body.settings.index.provided_name).to.be(index);

      const expectedSettings = [
        'max_inner_result_window',
        'unassigned',
        'max_terms_count',
        'lifecycle',
        'routing_partition_size',
        'max_docvalue_fields_search',
        'merge',
        'max_refresh_listeners',
        'max_regex_length',
        'load_fixed_bitset_filters_eagerly',
        'number_of_routing_shards',
        'write',
        'verified_before_close',
        'mapping',
        'source_only',
        'soft_deletes',
        'max_script_fields',
        'query',
        'format',
        'sort',
        'priority',
        'codec',
        'max_rescore_window',
        'analyze',
        'gc_deletes',
        'max_ngram_diff',
        'translog',
        'auto_expand_replicas',
        'requests',
        'data_path',
        'highlight',
        'routing',
        'search',
        'fielddata',
        'default_pipeline',
        'max_slices_per_scroll',
        'shard',
        'xpack',
        'percolator',
        'allocation',
        'refresh_interval',
        'indexing',
        'compound_format',
        'blocks',
        'max_result_window',
        'store',
        'queries',
        'warmer',
        'max_shingle_diff',
        'query_string',
      ];

      // Make sure none of the settings have been removed from ES API
      expectedSettings.forEach((setting) => {
        try {
          expect(Object.hasOwn(body.defaults.index, setting)).to.be(true);
        } catch {
          throw new Error(`Expected setting "${setting}" not found.`);
        }
      });
    });

    it('should update an index settings', async () => {
      const index = await createIndex();

      const { body: body1 } = await getIndexSettings(index);
      expect(body1.settings.index.number_of_replicas).to.be('1');

      const settings = {
        index: {
          number_of_replicas: 2,
        },
      };
      await updateIndexSettings(index, settings);

      const { body: body2 } = await getIndexSettings(index);
      expect(body2.settings.index.number_of_replicas).to.be('2');
    });
  });
}
