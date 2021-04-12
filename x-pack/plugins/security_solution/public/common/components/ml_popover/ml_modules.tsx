/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * ML Modules relevant to the SIEM App that should be used to display jobs within the Anomaly
 * Detection UI. Added as part of: https://github.com/elastic/kibana/pull/39678/files
 *
 */
export const mlModules: string[] = [
  'siem_auditbeat',
  'siem_auditbeat_auth',
  'siem_cloudtrail',
  'siem_packetbeat',
  'siem_winlogbeat',
  'siem_winlogbeat_auth',
  'security_linux',
  'security_windows',
];
