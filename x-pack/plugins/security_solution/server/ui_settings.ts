/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { CoreSetup } from '../../../../src/core/server';
import {
  APP_ID,
  DEFAULT_INDEX_KEY,
  DEFAULT_INDEX_PATTERN,
  DEFAULT_ANOMALY_SCORE,
  DEFAULT_APP_TIME_RANGE,
  DEFAULT_APP_REFRESH_INTERVAL,
  DEFAULT_INTERVAL_PAUSE,
  DEFAULT_INTERVAL_VALUE,
  DEFAULT_FROM,
  DEFAULT_TO,
  ENABLE_NEWS_FEED_SETTING,
  NEWS_FEED_URL_SETTING,
  NEWS_FEED_URL_SETTING_DEFAULT,
  IP_REPUTATION_LINKS_SETTING,
  IP_REPUTATION_LINKS_SETTING_DEFAULT,
  DEFAULT_RULES_TABLE_REFRESH_SETTING,
  DEFAULT_RULE_REFRESH_INTERVAL_ON,
  DEFAULT_RULE_REFRESH_INTERVAL_VALUE,
  DEFAULT_RULE_REFRESH_IDLE_VALUE,
} from '../common/constants';

export const initUiSettings = (uiSettings: CoreSetup['uiSettings']) => {
  uiSettings.register({
    [DEFAULT_APP_REFRESH_INTERVAL]: {
      type: 'json',
      name: i18n.translate('xpack.securitySolution.uiSettings.defaultRefreshIntervalLabel', {
        defaultMessage: 'Time filter refresh interval',
      }),
      value: `{
  "pause": ${DEFAULT_INTERVAL_PAUSE},
  "value": ${DEFAULT_INTERVAL_VALUE}
}`,
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.defaultRefreshIntervalDescription',
        {
          defaultMessage:
            '<p>Default refresh interval for the Security time filter, in milliseconds.</p>',
        }
      ),
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.object({
        value: schema.number(),
        pause: schema.boolean(),
      }),
    },
    [DEFAULT_APP_TIME_RANGE]: {
      type: 'json',
      name: i18n.translate('xpack.securitySolution.uiSettings.defaultTimeRangeLabel', {
        defaultMessage: 'Time filter period',
      }),
      value: `{
  "from": "${DEFAULT_FROM}",
  "to": "${DEFAULT_TO}"
}`,
      description: i18n.translate('xpack.securitySolution.uiSettings.defaultTimeRangeDescription', {
        defaultMessage: '<p>Default period of time in the Security time filter.</p>',
      }),
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.object({
        from: schema.string(),
        to: schema.string(),
      }),
    },
    [DEFAULT_INDEX_KEY]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.defaultIndexLabel', {
        defaultMessage: 'Elasticsearch indices',
      }),
      value: DEFAULT_INDEX_PATTERN,
      description: i18n.translate('xpack.securitySolution.uiSettings.defaultIndexDescription', {
        defaultMessage:
          '<p>Comma-delimited list of Elasticsearch indices from which the Security app collects events.</p>',
      }),
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.arrayOf(schema.string()),
    },
    [DEFAULT_ANOMALY_SCORE]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.defaultAnomalyScoreLabel', {
        defaultMessage: 'Anomaly threshold',
      }),
      value: 50,
      type: 'number',
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.defaultAnomalyScoreDescription',
        {
          defaultMessage:
            '<p>Value above which Machine Learning job anomalies are displayed in the Security app.</p><p>Valid values: 0 to 100.</p>',
        }
      ),
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.number(),
    },
    [ENABLE_NEWS_FEED_SETTING]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.enableNewsFeedLabel', {
        defaultMessage: 'News feed',
      }),
      value: true,
      description: i18n.translate('xpack.securitySolution.uiSettings.enableNewsFeedDescription', {
        defaultMessage: '<p>Enables the News feed</p>',
      }),
      type: 'boolean',
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.boolean(),
    },
    [DEFAULT_RULES_TABLE_REFRESH_SETTING]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.rulesTableRefresh', {
        defaultMessage: 'Rules auto refresh',
      }),
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.rulesTableRefreshDescription',
        {
          defaultMessage:
            '<p>Enables auto refresh on the all rules and monitoring tables, in milliseconds</p>',
        }
      ),
      type: 'json',
      value: `{
  "on": ${DEFAULT_RULE_REFRESH_INTERVAL_ON},
  "value": ${DEFAULT_RULE_REFRESH_INTERVAL_VALUE},
  "idleTimeout": ${DEFAULT_RULE_REFRESH_IDLE_VALUE}
}`,
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.object({
        idleTimeout: schema.number({ min: 300000 }),
        value: schema.number({ min: 60000 }),
        on: schema.boolean(),
      }),
    },
    [NEWS_FEED_URL_SETTING]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.newsFeedUrl', {
        defaultMessage: 'News feed URL',
      }),
      value: NEWS_FEED_URL_SETTING_DEFAULT,
      description: i18n.translate('xpack.securitySolution.uiSettings.newsFeedUrlDescription', {
        defaultMessage: '<p>News feed content will be retrieved from this URL</p>',
      }),
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.string(),
    },
    [IP_REPUTATION_LINKS_SETTING]: {
      name: i18n.translate('xpack.securitySolution.uiSettings.ipReputationLinks', {
        defaultMessage: 'IP Reputation Links',
      }),
      value: IP_REPUTATION_LINKS_SETTING_DEFAULT,
      type: 'json',
      description: i18n.translate(
        'xpack.securitySolution.uiSettings.ipReputationLinksDescription',
        {
          defaultMessage:
            'Array of URL templates to build the list of reputation URLs to be displayed on the IP Details page.',
        }
      ),
      category: [APP_ID],
      requiresPageReload: true,
      schema: schema.arrayOf(
        schema.object({
          name: schema.string(),
          url_template: schema.string(),
        })
      ),
    },
  });
};
