/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';

import { BrowserFields } from '../../../../../../common/containers/source';
import { Ecs } from '../../../../../../graphql/types';
import { NetflowRenderer } from '../netflow';

import { EndgameSecurityEventDetailsLine } from './endgame_security_event_details_line';
import { Details } from '../helpers';

interface Props {
  browserFields: BrowserFields;
  contextId: string;
  data: Ecs;
  timelineId: string;
}

export const EndgameSecurityEventDetails = React.memo<Props>(({ data, contextId, timelineId }) => {
  const endgameLogonType: number | null | undefined = get('endgame.logon_type[0]', data);
  const endgameSubjectDomainName: string | null | undefined = get(
    'endgame.subject_domain_name[0]',
    data
  );
  const endgameSubjectLogonId: string | null | undefined = get('endgame.subject_logon_id[0]', data);
  const endgameSubjectUserName: string | null | undefined = get(
    'endgame.subject_user_name[0]',
    data
  );
  const endgameTargetLogonId: string | null | undefined = get('endgame.target_logon_id[0]', data);
  const endgameTargetDomainName: string | null | undefined = get(
    'endgame.target_domain_name[0]',
    data
  );
  const endgameTargetUserName: string | null | undefined = get('endgame.target_user_name[0]', data);
  const eventAction: string | null | undefined = get('event.action[0]', data);
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
      <EndgameSecurityEventDetailsLine
        contextId={contextId}
        endgameLogonType={endgameLogonType}
        endgameSubjectDomainName={endgameSubjectDomainName}
        endgameSubjectLogonId={endgameSubjectLogonId}
        endgameSubjectUserName={endgameSubjectUserName}
        endgameTargetDomainName={endgameTargetDomainName}
        endgameTargetLogonId={endgameTargetLogonId}
        endgameTargetUserName={endgameTargetUserName}
        eventAction={eventAction}
        eventCode={eventCode}
        hostName={hostName}
        id={id}
        processExecutable={processExecutable}
        processName={processName}
        processPid={processPid}
        userDomain={userDomain}
        userName={userName}
        winlogEventId={winlogEventId}
      />
      <EuiSpacer size="s" />
      <NetflowRenderer data={data} timelineId={timelineId} />
    </Details>
  );
});

EndgameSecurityEventDetails.displayName = 'EndgameSecurityEventDetails';
