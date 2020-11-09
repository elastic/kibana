/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { ILogRetentionMessages } from './types';
import { renderLogRetentionDate } from '.';

const ANALYTICS_NO_LOGGING = i18n.translate(
  'xpack.enterpriseSearch.appSearch.settings.logRetention.analytics.noLogging',
  {
    defaultMessage: 'Analytics collection has been disabled for all engines.',
  }
);

const ANALYTICS_NO_LOGGING_COLLECTED = (disabledAt: string) =>
  i18n.translate(
    'xpack.enterpriseSearch.appSearch.settings.logRetention.analytics.noLogging.collected',
    {
      defaultMessage: 'The last date analytics were collected was {disabledAt}.',
      values: { disabledAt },
    }
  );

const ANALYTICS_NO_LOGGING_NOT_COLLECTED = i18n.translate(
  'xpack.enterpriseSearch.appSearch.settings.logRetention.analytics.noLogging.notCollected',
  {
    defaultMessage: 'There are no analytics collected.',
  }
);

const ANALYTICS_ILM_DISABLED = i18n.translate(
  'xpack.enterpriseSearch.appSearch.settings.logRetention.analytics.ilmDisabled',
  {
    defaultMessage: "App Search isn't managing analytics retention.",
  }
);

const ANALYTICS_CUSTOM_POLICY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.settings.logRetention.analytics.customPolicy',
  {
    defaultMessage: 'You have a custom analytics retention policy.',
  }
);

const ANALYTICS_STORED = (minAgeDays: number | null | undefined) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.settings.logRetention.analytics.stored', {
    defaultMessage: 'Your analytics are being stored for at least {minAgeDays} days.',
    values: { minAgeDays },
  });

const API_NO_LOGGING = i18n.translate(
  'xpack.enterpriseSearch.appSearch.settings.logRetention.api.noLogging',
  {
    defaultMessage: 'API logging has been disabled for all engines.',
  }
);

const API_NO_LOGGING_COLLECTED = (disabledAt: string) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.settings.logRetention.api.noLogging.collected', {
    defaultMessage: 'The last date logs were collected was {disabledAt}.',
    values: { disabledAt },
  });

const API_NO_LOGGING_NOT_COLLECTED = i18n.translate(
  'xpack.enterpriseSearch.appSearch.settings.logRetention.api.noLogging.notCollected',
  {
    defaultMessage: 'There are no logs collected.',
  }
);

const API_ILM_DISABLED = i18n.translate(
  'xpack.enterpriseSearch.appSearch.settings.logRetention.api.ilmDisabled',
  {
    defaultMessage: "App Search isn't managing API log retention.",
  }
);

const API_CUSTOM_POLICY = i18n.translate(
  'xpack.enterpriseSearch.appSearch.settings.logRetention.api.customPolicy',
  {
    defaultMessage: 'You have a custom API log retention policy.',
  }
);

const API_STORED = (minAgeDays: number | null | undefined) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.settings.logRetention.api.stored', {
    defaultMessage: 'Your logs are being stored for at least {minAgeDays} days.',
    values: { minAgeDays },
  });

export const ANALYTICS_MESSAGES: ILogRetentionMessages = {
  noLogging: (_, logRetentionSettings) =>
    `${ANALYTICS_NO_LOGGING} ${
      logRetentionSettings.disabledAt
        ? ANALYTICS_NO_LOGGING_COLLECTED(renderLogRetentionDate(logRetentionSettings.disabledAt))
        : ANALYTICS_NO_LOGGING_NOT_COLLECTED
    }`,
  ilmDisabled: ANALYTICS_ILM_DISABLED,
  customPolicy: ANALYTICS_CUSTOM_POLICY,
  defaultPolicy: (_, logRetentionSettings) =>
    ANALYTICS_STORED(logRetentionSettings.retentionPolicy?.minAgeDays),
};

export const API_MESSAGES: ILogRetentionMessages = {
  noLogging: (_, logRetentionSettings) =>
    `${API_NO_LOGGING} ${
      logRetentionSettings.disabledAt
        ? API_NO_LOGGING_COLLECTED(renderLogRetentionDate(logRetentionSettings.disabledAt))
        : API_NO_LOGGING_NOT_COLLECTED
    }`,
  ilmDisabled: API_ILM_DISABLED,
  customPolicy: API_CUSTOM_POLICY,
  defaultPolicy: (_, logRetentionSettings) =>
    API_STORED(logRetentionSettings.retentionPolicy?.minAgeDays),
};
