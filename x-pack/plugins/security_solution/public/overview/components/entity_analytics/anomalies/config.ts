/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as i18n from './translations';

interface AnomalyConfig {
  name: string;
  entity: 'User' | 'Host';
}

export const NOTABLE_ANOMALIES_CONFIG = {
  auth_rare_source_ip_for_a_user: {
    name: i18n.UNUSUAL_SOURCE_IP,
    entity: 'User',
  },
  packetbeat_dns_tunneling: {
    name: i18n.DNS_TUNNELING,
    entity: 'Host',
  },
  packetbeat_rare_server_domain: {
    name: i18n.UNUSUAL_NETWORK_DESTINATION,
    entity: 'Host',
  },

  packetbeat_rare_dns_question: {
    name: i18n.UNUSUAL_DNS_ACTIVITY,
    entity: 'Host',
  },
  suspicious_login_activity: {
    name: i18n.UNUSUAL_LOGIN_ACTIVITY,
    entity: 'User',
  },
  v3_windows_anomalous_script: {
    name: i18n.SUSPICIOUS_POWERSHELL_SCRIPT,
    entity: 'User',
  },
};

export const NOTABLE_ANOMALIES_IDS = Object.keys(
  NOTABLE_ANOMALIES_CONFIG
) as NotableAnomaliesJobId[];
export type NotableAnomaliesJobId = keyof typeof NOTABLE_ANOMALIES_CONFIG;
export type NotableAnomaliesConfig = Record<NotableAnomaliesJobId, AnomalyConfig>;
