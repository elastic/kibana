/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  From,
  RiskScore,
  Severity,
  Threat,
  ThreatSubtechnique,
  ThreatTechnique,
} from '@kbn/securitysolution-io-ts-alerting-types';
import type {
  Description,
  FalsePositives,
  Index,
  Interval,
  Name,
  Note,
  Query,
  References,
  Tags,
} from '../../common/detection_engine/schemas/common';

export const getQuery = (): Query => {
  return 'host.name: *';
};

export const getRuleName = (): Name => {
  return 'Test Rule';
};

export const getDescription = (): Description => {
  return 'The rule description';
};

export const getSeverity = (): Severity => {
  return 'high';
};

export const getRiskScore = (): RiskScore => {
  return 17;
};

export const getTags = (): Tags => {
  return ['test', 'newRule'];
};

export const getReferenceUrls = (): References => {
  return ['http://example.com/', 'https://example.com/'];
};

export const getFalsePositives = (): FalsePositives => {
  return ['False1', 'False2'];
};

export const getNote = (): Note => {
  return '# test markdown';
};

export const getThreat = (): Threat => {
  return {
    framework: 'MITRE ATT&CK',
    tactic: {
      name: 'Credential Access',
      id: 'TA0006',
      reference: 'https://attack.mitre.org/tactics/TA0006',
    },
  };
};

export const getThreatTechnique = (): ThreatTechnique => {
  return {
    id: 'T1003',
    name: 'OS Credential Dumping',
    reference: 'https://attack.mitre.org/techniques/T1003',
  };
};

export const getThreatSubtechnique = (): ThreatSubtechnique => {
  return {
    name: '/etc/passwd and /etc/shadow',
    id: 'T1003.008',
    reference: 'https://attack.mitre.org/techniques/T1003/008',
  };
};

export const getInterval = (): Interval => {
  return '5m';
};

export const getFrom = (): From => {
  return '50000h';
};

export const getDefaultIndexPatterns = (): Index => {
  return [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'traces-apm*',
    'winlogbeat-*',
    '-*elastic-cloud-logs-*',
  ];
};
