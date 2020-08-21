/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DEFAULT_INDEX_PATTERN, DEFAULT_SIGNALS_INDEX } from '../../../../common/constants';

export const SOURCERER_FEATURE_FLAG_ON = true;

export enum SecurityPageName {
  default = 'default',
  host = 'host',
  detections = 'detections',
  timeline = 'timeline',
  network = 'network',
}

export type SourceGroupsType = keyof typeof SecurityPageName;

export const sourceGroups = {
  [SecurityPageName.default]: DEFAULT_INDEX_PATTERN,
  [SecurityPageName.host]: ['auditbeat-*', 'filebeat-*', 'logs-*', 'winlogbeat-*'],
  [SecurityPageName.detections]: [DEFAULT_SIGNALS_INDEX],
  [SecurityPageName.timeline]: DEFAULT_INDEX_PATTERN,
  [SecurityPageName.network]: ['auditbeat-*', 'filebeat-*', 'packetbeat-*'],
};
