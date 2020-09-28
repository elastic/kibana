/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ByteSizeValue } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { defaults, get } from 'lodash';
import { ReportingCore } from '../..';
import { API_DIAGNOSE_URL } from '../../../common/constants';
import { LevelLogger as Logger } from '../../lib';
import { authorizedUserPreRoutingFactory } from '../lib/authorized_user_pre_routing';
import { DiagnosticResponse } from './';

const KIBANA_MAX_SIZE_BYTES_PATH = 'csv.maxSizeBytes';
const ES_MAX_SIZE_BYTES_PATH = 'http.max_content_length';

const numberToByteSizeValue = (value: number | ByteSizeValue) => {
  if (typeof value === 'number') {
    return new ByteSizeValue(value);
  }

  return value;
};

export const registerDiagnoseConfig = (reporting: ReportingCore, logger: Logger) => {
  const setupDeps = reporting.getPluginSetupDeps();
  const userHandler = authorizedUserPreRoutingFactory(reporting);
  const { router, elasticsearch } = setupDeps;

  router.post(
    {
      path: `${API_DIAGNOSE_URL}/config`,
      validate: {},
    },
    userHandler(async (user, context, req, res) => {
      const warnings = [];
      const { callAsInternalUser } = elasticsearch.legacy.client;
      const config = reporting.getConfig();

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
      const elasticSearchMaxContentBytes = ByteSizeValue.parse(elasticSearchMaxContent);
      const kibanaMaxContentBytes = numberToByteSizeValue(config.get('csv', 'maxSizeBytes'));

      if (kibanaMaxContentBytes.isGreaterThan(elasticSearchMaxContentBytes)) {
        const maxContentSizeWarning = i18n.translate(
          'xpack.reporting.diagnostic.configSizeMismatch',
          {
            defaultMessage:
              `xpack.reporting.{KIBANA_MAX_SIZE_BYTES_PATH} ({kibanaMaxContentBytes}) is higher than ElasticSearch's {ES_MAX_SIZE_BYTES_PATH} ({elasticSearchMaxContentBytes}). ` +
              `Please set {ES_MAX_SIZE_BYTES_PATH} in ElasticSearch to match, or lower your xpack.reporting.{KIBANA_MAX_SIZE_BYTES_PATH} in Kibana.`,
            values: {
              kibanaMaxContentBytes: kibanaMaxContentBytes.getValueInBytes(),
              elasticSearchMaxContentBytes: elasticSearchMaxContentBytes.getValueInBytes(),
              KIBANA_MAX_SIZE_BYTES_PATH,
              ES_MAX_SIZE_BYTES_PATH,
            },
          }
        );
        warnings.push(maxContentSizeWarning);
      }

      if (warnings.length) {
        warnings.forEach((warn) => logger.warn(warn));
      }

      const body: DiagnosticResponse = {
        help: warnings,
        success: !warnings.length,
        logs: warnings.join('\n'),
      };

      return res.ok({ body });
    })
  );
};
