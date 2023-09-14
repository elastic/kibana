/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';

import { RowRendererId } from '../../../../../common/api/timeline';
import {
  AlertsExample,
  AuditdExample,
  AuditdFileExample,
  LibraryExample,
  NetflowExample,
  RegistryExample,
  SuricataExample,
  SystemExample,
  SystemDnsExample,
  SystemEndgameProcessExample,
  SystemFileExample,
  SystemFimExample,
  SystemSecurityEventExample,
  SystemSocketExample,
  ThreatMatchExample,
  ZeekExample,
} from '../examples';
import { eventRendererNames } from './constants';
import * as i18n from './translations';

const Link = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <EuiLink
    href={url}
    target="_blank"
    rel="noopener nofollow noreferrer"
    data-test-subj="externalLink"
  >
    {children}
  </EuiLink>
);

export interface RowRendererOption {
  id: RowRendererId;
  name: string;
  description: React.ReactNode;
  searchableDescription: string;
  example: React.ReactNode;
}

export const renderers: RowRendererOption[] = [
  {
    id: RowRendererId.alerts,
    name: eventRendererNames[RowRendererId.alerts],
    description: i18n.ALERTS_DESCRIPTION,
    example: AlertsExample,
    searchableDescription: i18n.ALERTS_DESCRIPTION,
  },
  {
    id: RowRendererId.auditd,
    name: eventRendererNames[RowRendererId.auditd],
    description: (
      <span>
        <Link url="https://www.elastic.co/guide/en/beats/auditbeat/current/auditbeat-module-auditd.html">
          {i18n.AUDITD_NAME}
        </Link>{' '}
        {i18n.AUDITD_DESCRIPTION_PART1}
      </span>
    ),
    example: AuditdExample,
    searchableDescription: `${i18n.AUDITD_NAME} ${i18n.AUDITD_DESCRIPTION_PART1}`,
  },
  {
    id: RowRendererId.auditd_file,
    name: eventRendererNames[RowRendererId.auditd_file],
    description: (
      <span>
        <Link url="https://www.elastic.co/guide/en/beats/auditbeat/current/auditbeat-module-auditd.html">
          {i18n.AUDITD_NAME}
        </Link>{' '}
        {i18n.AUDITD_FILE_DESCRIPTION_PART1}
      </span>
    ),
    example: AuditdFileExample,
    searchableDescription: `${i18n.AUDITD_FILE_NAME} ${i18n.AUDITD_FILE_DESCRIPTION_PART1}`,
  },
  {
    id: RowRendererId.library,
    name: eventRendererNames[RowRendererId.library],
    description: i18n.LIBRARY_DESCRIPTION,
    example: LibraryExample,
    searchableDescription: i18n.LIBRARY_DESCRIPTION,
  },
  {
    id: RowRendererId.system_security_event,
    name: eventRendererNames[RowRendererId.system_security_event],
    description: (
      <div>
        <p>{i18n.AUTHENTICATION_DESCRIPTION_PART1}</p>
        <br />
        <p>{i18n.AUTHENTICATION_DESCRIPTION_PART2}</p>
      </div>
    ),
    example: SystemSecurityEventExample,
    searchableDescription: `${i18n.AUTHENTICATION_DESCRIPTION_PART1} ${i18n.AUTHENTICATION_DESCRIPTION_PART2}`,
  },
  {
    id: RowRendererId.system_dns,
    name: eventRendererNames[RowRendererId.system_dns],
    description: i18n.DNS_DESCRIPTION_PART1,
    example: SystemDnsExample,
    searchableDescription: i18n.DNS_DESCRIPTION_PART1,
  },
  {
    id: RowRendererId.netflow,
    name: eventRendererNames[RowRendererId.netflow],
    description: (
      <div>
        <p>{i18n.FLOW_DESCRIPTION_PART1}</p>
        <br />
        <p>{i18n.FLOW_DESCRIPTION_PART2}</p>
      </div>
    ),
    example: NetflowExample,
    searchableDescription: `${i18n.FLOW_DESCRIPTION_PART1} ${i18n.FLOW_DESCRIPTION_PART2}`,
  },
  {
    id: RowRendererId.system,
    name: eventRendererNames[RowRendererId.system],
    description: (
      <div>
        <p>
          {i18n.SYSTEM_DESCRIPTION_PART1}{' '}
          <Link url="https://www.elastic.co/guide/en/beats/auditbeat/current/auditbeat-module-system.html">
            {i18n.SYSTEM_NAME}
          </Link>{' '}
          {i18n.SYSTEM_DESCRIPTION_PART2}
        </p>
        <br />
        <p>{i18n.SYSTEM_DESCRIPTION_PART3}</p>
      </div>
    ),
    example: SystemExample,
    searchableDescription: `${i18n.SYSTEM_DESCRIPTION_PART1} ${i18n.SYSTEM_NAME} ${i18n.SYSTEM_DESCRIPTION_PART2} ${i18n.SYSTEM_DESCRIPTION_PART3}`,
  },
  {
    id: RowRendererId.system_endgame_process,
    name: eventRendererNames[RowRendererId.system_endgame_process],
    description: (
      <div>
        <p>{i18n.PROCESS_DESCRIPTION_PART1}</p>
        <br />
        <p>{i18n.PROCESS_DESCRIPTION_PART2}</p>
      </div>
    ),
    example: SystemEndgameProcessExample,
    searchableDescription: `${i18n.PROCESS_DESCRIPTION_PART1} ${i18n.PROCESS_DESCRIPTION_PART2}`,
  },
  {
    id: RowRendererId.registry,
    name: eventRendererNames[RowRendererId.registry],
    description: i18n.REGISTRY_DESCRIPTION,
    example: RegistryExample,
    searchableDescription: i18n.REGISTRY_DESCRIPTION,
  },
  {
    id: RowRendererId.system_fim,
    name: eventRendererNames[RowRendererId.system_fim],
    description: i18n.FIM_DESCRIPTION_PART1,
    example: SystemFimExample,
    searchableDescription: i18n.FIM_DESCRIPTION_PART1,
  },
  {
    id: RowRendererId.system_file,
    name: eventRendererNames[RowRendererId.system_file],
    description: i18n.FILE_DESCRIPTION_PART1,
    example: SystemFileExample,
    searchableDescription: i18n.FILE_DESCRIPTION_PART1,
  },
  {
    id: RowRendererId.system_socket,
    name: eventRendererNames[RowRendererId.system_socket],
    description: (
      <div>
        <p>{i18n.SOCKET_DESCRIPTION_PART1}</p>
        <br />
        <p>{i18n.SOCKET_DESCRIPTION_PART2}</p>
      </div>
    ),
    example: SystemSocketExample,
    searchableDescription: `${i18n.SOCKET_DESCRIPTION_PART1} ${i18n.SOCKET_DESCRIPTION_PART2}`,
  },
  {
    id: RowRendererId.suricata,
    name: eventRendererNames[RowRendererId.suricata],
    description: (
      <p>
        {i18n.SURICATA_DESCRIPTION_PART1}{' '}
        <Link url="https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-module-suricata.html">
          {i18n.SURICATA_NAME}
        </Link>{' '}
        {i18n.SURICATA_DESCRIPTION_PART2}
      </p>
    ),
    example: SuricataExample,
    searchableDescription: `${i18n.SURICATA_DESCRIPTION_PART1} ${i18n.SURICATA_NAME} ${i18n.SURICATA_DESCRIPTION_PART2}`,
  },
  {
    id: RowRendererId.threat_match,
    name: eventRendererNames[RowRendererId.threat_match],
    description: i18n.THREAT_MATCH_DESCRIPTION,
    example: ThreatMatchExample,
    searchableDescription: `${i18n.THREAT_MATCH_NAME} ${i18n.THREAT_MATCH_DESCRIPTION}`,
  },
  {
    id: RowRendererId.zeek,
    name: eventRendererNames[RowRendererId.zeek],
    description: (
      <p>
        {i18n.ZEEK_DESCRIPTION_PART1}{' '}
        <Link url="https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-module-zeek.html">
          {i18n.ZEEK_NAME}
        </Link>{' '}
        {i18n.ZEEK_DESCRIPTION_PART2}
      </p>
    ),
    example: ZeekExample,
    searchableDescription: `${i18n.ZEEK_DESCRIPTION_PART1} ${i18n.ZEEK_NAME} ${i18n.ZEEK_DESCRIPTION_PART2}`,
  },
];
