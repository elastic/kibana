/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const SOURCERER_FEATURE_FLAG_ON = true;

export enum SOURCE_GROUPS {
  default = 'default',
  host = 'host',
  detections = 'detections',
  timeline = 'timeline',
  network = 'network',
}

export type SourceGroupsType = keyof typeof SOURCE_GROUPS;

export const sourceGroups = {
  [SOURCE_GROUPS.default]: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  [SOURCE_GROUPS.host]: [
    'apm-*-transaction*',
    'endgame-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  [SOURCE_GROUPS.detections]: ['signals-*'],
  [SOURCE_GROUPS.timeline]: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  [SOURCE_GROUPS.network]: ['auditbeat-*', 'filebeat-*'],
};
