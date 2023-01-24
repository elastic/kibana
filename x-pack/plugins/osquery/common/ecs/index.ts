/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentEcs } from './agent';
import type { AuditdEcs } from './auditd';
import type { DestinationEcs } from './destination';
import type { DnsEcs } from './dns';
import type { EndgameEcs } from './endgame';
import type { EventEcs } from './event';
import type { FileEcs } from './file';
import type { GeoEcs } from './geo';
import type { HostEcs } from './host';
import type { NetworkEcs } from './network';
import type { RuleEcs } from './rule';
import type { SignalEcs } from './signal';
import type { SourceEcs } from './source';
import type { SuricataEcs } from './suricata';
import type { TlsEcs } from './tls';
import type { ZeekEcs } from './zeek';
import type { HttpEcs } from './http';
import type { UrlEcs } from './url';
import type { UserEcs } from './user';
import type { WinlogEcs } from './winlog';
import type { ProcessEcs } from './process';
import type { SystemEcs } from './system';

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
  rule?: RuleEcs;
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
}
