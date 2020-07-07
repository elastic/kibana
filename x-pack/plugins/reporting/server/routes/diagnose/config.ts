/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { defaults, get } from 'lodash';
import { ReportingCore } from '../..';
import { API_DIAGNOSE_URL } from '../../../common/constants';
import { authorizedUserPreRoutingFactory } from '../lib/authorized_user_pre_routing';

const KIBANA_MAX_SIZE_BYTES_PATH = 'csv.maxSizeBytes';
const ES_MAX_SIZE_BYTES_PATH = 'http.max_content_length';

export const registerDiagnoseConfig = (reporting: ReportingCore) => {
  const setupDeps = reporting.getPluginSetupDeps();
  const userHandler = authorizedUserPreRoutingFactory(reporting);
  const config = reporting.getConfig();
  const { router, elasticsearch } = setupDeps;

  router.post(
    {
      path: `${API_DIAGNOSE_URL}/config`,
      // Currently no supported params, but keeping it open
      // in case the need/want arises
      validate: {},
    },
    userHandler(async (user, context, req, res) => {
      const warnings = [];
      const { callAsInternalUser } = elasticsearch.legacy.client;

      const elasticClusterSettingsResponse = await callAsInternalUser('cluster.getSettings', {
        includeDefaults: true,
      });
      const { persistent, transient, defaults: defaultSettings } = elasticClusterSettingsResponse;
      const elasticClusterSettings = defaults({}, persistent, transient, defaultSettings);

      const elasticSearchMaxContent = get(
        elasticClusterSettings,
        'http.max_content_length',
        '100mb'
      );
      const elasticSearchMaxContentBytes = numeral().unformat(
        elasticSearchMaxContent.toUpperCase()
      );
      const kibanaMaxContentBytes = config.get('csv', 'maxSizeBytes');

      if (kibanaMaxContentBytes > elasticSearchMaxContentBytes) {
        warnings.push(
          `xpack.reporting.${KIBANA_MAX_SIZE_BYTES_PATH} (${kibanaMaxContentBytes}) is higher than ElasticSearch's ${ES_MAX_SIZE_BYTES_PATH} (${elasticSearchMaxContentBytes}). ` +
            `Please set ${ES_MAX_SIZE_BYTES_PATH} in ElasticSearch to match, or lower your xpack.reporting.${KIBANA_MAX_SIZE_BYTES_PATH} in Kibana to avoid this warning.`
        );
      }

      return res.ok({
        body: { warnings },
      });
    })
  );
};
