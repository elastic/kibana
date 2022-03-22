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
import { DllEcs } from './dll';
import { EndgameEcs } from './endgame';
import { EventEcs } from './event';
import { FileEcs } from './file';
import { GeoEcs } from './geo';
import { HostEcs } from './host';
import { NetworkEcs } from './network';
import { RegistryEcs } from './registry';
import { RuleEcs } from './rule';
import { SignalEcs, SignalEcsAAD } from './signal';
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
import { MemoryProtection } from './memory_protection';
import { Target } from './target_type';

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
  rule?: RuleEcs;
  kibana?: {
    alert: SignalEcsAAD;
  };
  signal?: SignalEcs;
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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Memory_protection?: MemoryProtection;
  Target?: Target;
  dll?: DllEcs;
  'kibana.alert.workflow_status'?: 'open' | 'acknowledged' | 'in-progress' | 'closed'; // should remove inprogress?
  'kibana.alert.rule.parameters'?: { index: string[] };
}
