/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AuditdEcs } from './auditd';
import { DestinationEcs } from './destination';
import { DnsEcs } from './dns';
import { EndgameEcs } from './endgame';
import { EventEcs } from './event';
import { GeoEcs } from './geo';
import { HostEcs } from './host';
import { NetworkEcs } from './network';
import { RuleEcs } from './rule';
import { SignalEcs } from './signal';
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

export interface Ecs {
  _id: string;

  _index?: string;

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

  file?: File;

  system?: SystemEcs;
}
