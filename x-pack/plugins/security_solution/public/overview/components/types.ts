/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
export type OverviewStatId =
  | 'auditbeatAuditd'
  | 'auditbeatFIM'
  | 'auditbeatLogin'
  | 'auditbeatPackage'
  | 'auditbeatProcess'
  | 'auditbeatSocket'
  | 'auditbeatUser'
  | 'endgameDns'
  | 'endgameFile'
  | 'endgameImageLoad'
  | 'endgameNetwork'
  | 'endgameProcess'
  | 'endgameRegistry'
  | 'endgameSecurity'
  | 'filebeatCisco'
  | 'filebeatNetflow'
  | 'filebeatPanw'
  | 'filebeatSuricata'
  | 'filebeatSystemModule'
  | 'filebeatZeek'
  | 'packetbeatDNS'
  | 'packetbeatFlow'
  | 'packetbeatTLS'
  | 'winlogbeatSecurity'
  | 'winlogbeatMWSysmonOperational';

export interface FormattedStat {
  count: number;
  id: OverviewStatId;
  title: React.ReactNode;
}

export interface StatGroup {
  name: string | React.ReactNode;
  groupId: string;
  statIds: OverviewStatId[];
}
