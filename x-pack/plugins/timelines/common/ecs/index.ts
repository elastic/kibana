/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentEcs } from './agent';
import { AuditdEcs } from './auditd';
import { DestinationEcs } from './destination';
import { DnsEcs } from './dns';
import { EndgameEcs } from './endgame';
import { EventEcs } from './event';
import { FileEcs } from './file';
import { GeoEcs } from './geo';
import { HostEcs } from './host';
import { NetworkEcs } from './network';
import { RegistryEcs } from './registry';
import { SourceEcs } from './source';
import { SuricataEcs } from './suricata';
import { TlsEcs } from './tls';
import { ZeekEcs } from './zeek';
import { HttpEcs } from './http';
import { UrlEcs } from './url';
import { UserEcs } from './user';
import { WinlogEcs } from './winlog';
import { ProcessEcs } from './process';
import { SystemEcs } from './system';
import { ThreatEcs } from './threat';
import { Ransomware } from './ransomware';

export interface Ecs {
  _id: string;
  _index?: string;
  agent?: AgentEcs;
  auditd?: AuditdEcs;
  destination?: DestinationEcs;
  dns?: DnsEcs;
  endgame?: EndgameEcs;
  event?: EventEcs;
  geo?: GeoEcs;
  host?: HostEcs;
  network?: NetworkEcs;
  registry?: RegistryEcs;
  'kibana.alert.building_block_type'?: string[];
  'kibana.alert.original_time'?: string[];
  'kibana.alert.workflow_status'?: string[];
  'kibana.alert.group.id'?: string[];
  'kibana.alert.threshold_result'?: string[];
  'kibana.alert.rule.rule_id'?: string[];
  'kibana.alert.rule.name'?: string[];
  'kibana.alert.rule.false_positives'?: string[];
  'kibana.alert.rule.saved_id'?: string[];
  'kibana.alert.rule.timeline_id'?: string[];
  'kibana.alert.rule.timeline_title'?: string[];
  'kibana.alert.rule.max_signals'?: number[];
  'kibana.alert.rule.risk_score'?: string[];
  'kibana.alert.rule.output_index'?: string[];
  'kibana.alert.rule.description'?: string[];
  'kibana.alert.rule.from'?: string[];
  'kibana.alert.rule.immutable'?: boolean[];
  'kibana.alert.rule.index'?: string[];
  'kibana.alert.rule.interval'?: string[];
  'kibana.alert.rule.language'?: string[];
  'kibana.alert.rule.query'?: string[];
  'kibana.alert.rule.references'?: string[];
  'kibana.alert.rule.severity'?: string[];
  'kibana.alert.rule.tags'?: string[];
  'kibana.alert.rule.threat'?: unknown;
  'kibana.alert.rule.threshold'?: unknown;
  'kibana.alert.rule.type'?: string[];
  'kibana.alert.rule.size'?: string[];
  'kibana.alert.rule.to'?: string[];
  'kibana.alert.rule.enabled'?: boolean[];
  'kibana.alert.rule.filters'?: unknown;
  'kibana.alert.rule.created_at'?: string[];
  'kibana.alert.rule.updated_at'?: string[];
  'kibana.alert.rule.created_by'?: string[];
  'kibana.alert.rule.updated_by'?: string[];
  'kibana.alert.rule.uuid'?: string[];
  'kibana.alert.rule.version'?: string[];
  'kibana.alert.rule.note'?: string[];
  source?: SourceEcs;
  suricata?: SuricataEcs;
  tls?: TlsEcs;
  zeek?: ZeekEcs;
  http?: HttpEcs;
  url?: UrlEcs;
  timestamp?: string;
  message?: string[];
  user?: UserEcs;
  winlog?: WinlogEcs;
  process?: ProcessEcs;
  file?: FileEcs;
  system?: SystemEcs;
  threat?: ThreatEcs;
  // This should be temporary
  eql?: { parentId: string; sequenceNumber: string };
  Ransomware?: Ransomware;
}
