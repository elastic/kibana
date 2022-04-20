/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';

import { Details } from '../helpers';
import { Ecs } from '../../../../../../../common/ecs';
import { NetflowRenderer } from '../netflow';

import { DnsRequestEventDetailsLine } from './dns_request_event_details_line';

interface Props {
  contextId: string;
  data: Ecs;
  isDraggable?: boolean;
  timelineId: string;
}

export const DnsRequestEventDetails = React.memo<Props>(
  ({ data, contextId, isDraggable, timelineId }) => {
    const dnsQuestionName: string | null | undefined = get('dns.question.name[0]', data);
    const dnsQuestionType: string | null | undefined = get('dns.question.type[0]', data);
    const dnsResolvedIp: string | null | undefined = get('dns.resolved_ip[0]', data);
    const dnsResponseCode: string | null | undefined = get('dns.response_code[0]', data);
    const eventCode: string | null | undefined = get('event.code[0]', data);
    const hostName: string | null | undefined = get('host.name[0]', data);
    const id = data._id;
    const processExecutable: string | null | undefined = get('process.executable[0]', data);
    const processName: string | null | undefined = get('process.name[0]', data);
    const processPid: number | null | undefined = get('process.pid[0]', data);
    const userDomain: string | null | undefined = get('user.domain[0]', data);
    const userName: string | null | undefined = get('user.name[0]', data);
    const winlogEventId: string | null | undefined = get('winlog.event_id[0]', data);

    return (
      <Details>
        <DnsRequestEventDetailsLine
          contextId={contextId}
          dnsQuestionName={dnsQuestionName}
          dnsQuestionType={dnsQuestionType}
          dnsResolvedIp={dnsResolvedIp}
          dnsResponseCode={dnsResponseCode}
          eventCode={eventCode}
          hostName={hostName}
          id={id}
          isDraggable={isDraggable}
          processExecutable={processExecutable}
          processName={processName}
          processPid={processPid}
          userDomain={userDomain}
          userName={userName}
          winlogEventId={winlogEventId}
        />
        <EuiSpacer size="s" />
        <NetflowRenderer data={data} isDraggable={isDraggable} timelineId={timelineId} />
      </Details>
    );
  }
);

DnsRequestEventDetails.displayName = 'DnsRequestEventDetails';
