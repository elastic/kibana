/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * On master, the version should represent the next major version (e.g., master --> 8.0.0)
 * The release branch should match the release version (e.g., 7.x --> 7.0.0)
 */
export const MAJOR_VERSION = '8.0.0';

/*
 * Map of 7.0 --> 8.0 index setting deprecation log messages and associated settings
 * We currently only support one setting deprecation (translog retention), but the code is written
 * in a way to be able to support any number of deprecated index settings defined here
 */
export const indexSettingDeprecations = {
  translog: {
    deprecationMessage: 'translog retention settings are ignored', // expected message from ES deprecation info API
    settings: ['translog.retention.size', 'translog.retention.age'],
  },
};

export const API_BASE_PATH = '/api/upgrade_assistant';

/**
 * This is the repository where Cloud stores its backup snapshots.
 */
export const CLOUD_SNAPSHOT_REPOSITORY = 'found-snapshots';

export const DEPRECATION_WARNING_UPPER_LIMIT = 999999;
export const DEPRECATION_LOGS_SOURCE_ID = 'deprecation_logs';
export const DEPRECATION_LOGS_INDEX = '.logs-deprecation.elasticsearch-default';
export const DEPRECATION_LOGS_INDEX_PATTERN = '.logs-deprecation.elasticsearch-default';

export const CLOUD_BACKUP_STATUS_POLL_INTERVAL_MS = 60000;
export const DEPRECATION_LOGS_COUNT_POLL_INTERVAL_MS = 15000;
