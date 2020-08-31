/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';
import { ExternalLinkIcon } from '../../../../common/components/external_link_icon';

import { RowRendererId } from '../../../../../common/types/timeline';
import {
  AuditdExample,
  AuditdFileExample,
  NetflowExample,
  SuricataExample,
  SystemExample,
  SystemDnsExample,
  SystemEndgameProcessExample,
  SystemFileExample,
  SystemFimExample,
  SystemSecurityEventExample,
  SystemSocketExample,
  ZeekExample,
} from '../examples';
import * as i18n from './translations';

const Link = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <EuiLink
    href={url}
    target="_blank"
    rel="noopener nofollow noreferrer"
    data-test-subj="externalLink"
  >
    {children}
    <ExternalLinkIcon data-test-subj="externalLinkIcon" />
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
    id: RowRendererId.auditd,
    name: i18n.AUDITD_NAME,
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
    name: i18n.AUDITD_FILE_NAME,
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
    id: RowRendererId.system_security_event,
    name: i18n.AUTHENTICATION_NAME,
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
    name: i18n.DNS_NAME,
    description: i18n.DNS_DESCRIPTION_PART1,
    example: SystemDnsExample,
    searchableDescription: i18n.DNS_DESCRIPTION_PART1,
  },
  {
    id: RowRendererId.netflow,
    name: i18n.FLOW_NAME,
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
    name: i18n.SYSTEM_NAME,
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
    name: i18n.PROCESS,
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
    id: RowRendererId.system_fim,
    name: i18n.FIM_NAME,
    description: i18n.FIM_DESCRIPTION_PART1,
    example: SystemFimExample,
    searchableDescription: i18n.FIM_DESCRIPTION_PART1,
  },
  {
    id: RowRendererId.system_file,
    name: i18n.FILE_NAME,
    description: i18n.FILE_DESCRIPTION_PART1,
    example: SystemFileExample,
    searchableDescription: i18n.FILE_DESCRIPTION_PART1,
  },
  {
    id: RowRendererId.system_socket,
    name: i18n.SOCKET_NAME,
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
    name: 'Suricata',
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
    id: RowRendererId.zeek,
    name: i18n.ZEEK_NAME,
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
