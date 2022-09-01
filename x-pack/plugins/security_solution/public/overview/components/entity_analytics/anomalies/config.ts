/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const enum AnomalyConfigEntity {
  User,
  Host,
}
interface AnomalyConfig {
  name: string;
  entity: AnomalyConfigEntity;
}

export const NOTABLE_ANOMALIES_CONFIG = {
  auth_rare_source_ip_for_a_user: {
    entity: AnomalyConfigEntity.User,
  },
  packetbeat_dns_tunneling: {
    entity: AnomalyConfigEntity.Host,
  },
  packetbeat_rare_server_domain: {
    entity: AnomalyConfigEntity.Host,
  },
  packetbeat_rare_dns_question: {
    entity: AnomalyConfigEntity.Host,
  },
  suspicious_login_activity: {
    entity: AnomalyConfigEntity.User,
  },
  v3_windows_anomalous_script: {
    entity: AnomalyConfigEntity.User,
  },
};

export const NOTABLE_ANOMALIES_IDS = Object.keys(
  NOTABLE_ANOMALIES_CONFIG
) as NotableAnomaliesJobId[];
export type NotableAnomaliesJobId = keyof typeof NOTABLE_ANOMALIES_CONFIG;
export type NotableAnomaliesConfig = Record<NotableAnomaliesJobId, AnomalyConfig>;
