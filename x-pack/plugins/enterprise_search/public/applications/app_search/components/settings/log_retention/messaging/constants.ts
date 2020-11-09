/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ILogRetentionMessages } from './types';
import { renderLogRetentionDate } from '.';

export const ANALYTICS_MESSAGES: ILogRetentionMessages = {
  noLogging: (_, logRetentionSettings) =>
    `Analytics collection has been disabled for all engines. ${
      logRetentionSettings.disabledAt
        ? `The last date analytics were collected was ${renderLogRetentionDate(
            logRetentionSettings.disabledAt
          )}.`
        : 'There are no analytics collected.'
    }`,
  ilmDisabled: "App Search isn't managing analytics retention.",
  customPolicy: 'You have a custom analytics retention policy.',
  defaultPolicy: (_, logRetentionSettings) =>
    `Your analytics are being stored for at least ${logRetentionSettings.retentionPolicy?.minAgeDays} days.`,
};

export const API_MESSAGES: ILogRetentionMessages = {
  noLogging: (_, logRetentionSettings) =>
    `API logging has been disabled for all engines. ${
      logRetentionSettings.disabledAt
        ? `The last date logs were collected was ${renderLogRetentionDate(
            logRetentionSettings.disabledAt
          )}.`
        : 'There are no logs collected.'
    }`,
  ilmDisabled: "App Search isn't managing API log retention.",
  customPolicy: 'You have a custom API log retention policy.',
  defaultPolicy: (_, logRetentionSettings) =>
    `Your logs are being stored for at least ${logRetentionSettings.retentionPolicy?.minAgeDays} days.`,
};
