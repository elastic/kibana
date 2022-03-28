/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';

import { BrowserFields } from '../../../../../../common/containers/source';
import { Ecs } from '../../../../../../../common/ecs';
import { DraggableBadge } from '../../../../../../common/components/draggables';

import * as i18n from './translations';
import { NetflowRenderer } from '../netflow';
import { TokensFlexItem, Details } from '../helpers';
import { ProcessDraggable } from '../process_draggable';
import { Args } from '../args';
import { SessionUserHostWorkingDir } from './session_user_host_working_dir';

interface Props {
  id: string;
  hostName: string | null | undefined;
  result: string | null | undefined;
  userName: string | null | undefined;
  primary: string | null | undefined;
  contextId: string;
  text: string;
  secondary: string | null | undefined;
  processName: string | null | undefined;
  processPid: number | null | undefined;
  processExecutable: string | null | undefined;
  processTitle: string | null | undefined;
  workingDirectory: string | null | undefined;
  args: string[] | null | undefined;
  session: string | null | undefined;
  isDraggable?: boolean;
}

export const AuditdGenericLine = React.memo<Props>(
  ({
    id,
    contextId,
    hostName,
    userName,
    primary,
    processName,
    processPid,
    processExecutable,
    processTitle,
    secondary,
    workingDirectory,
    args,
    result,
    session,
    text,
    isDraggable,
  }) => (
    <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none" wrap={true}>
      <SessionUserHostWorkingDir
        eventId={id}
        contextId={contextId}
        hostName={hostName}
        userName={userName}
        primary={primary}
        secondary={secondary}
        workingDirectory={workingDirectory}
        session={session}
        isDraggable={isDraggable}
      />
      {processExecutable != null && (
        <TokensFlexItem grow={false} component="span">
          {text}
        </TokensFlexItem>
      )}
      <TokensFlexItem grow={false} component="span">
        <ProcessDraggable
          contextId={contextId}
          endgamePid={undefined}
          endgameProcessName={undefined}
          eventId={id}
          processPid={processPid}
          processName={processName}
          processExecutable={processExecutable}
          isDraggable={isDraggable}
        />
      </TokensFlexItem>
      <Args
        eventId={id}
        args={args}
        contextId={contextId}
        isDraggable={isDraggable}
        processTitle={processTitle}
      />
      {result != null && (
        <TokensFlexItem grow={false} component="span">
          {i18n.WITH_RESULT}
        </TokensFlexItem>
      )}
      <TokensFlexItem grow={false} component="span">
        <DraggableBadge
          contextId={contextId}
          eventId={id}
          field="auditd.result"
          isDraggable={isDraggable}
          queryValue={result}
          value={result}
        />
      </TokensFlexItem>
    </EuiFlexGroup>
  )
);

AuditdGenericLine.displayName = 'AuditdGenericLine';

interface GenericDetailsProps {
  browserFields: BrowserFields;
  data: Ecs;
  isDraggable?: boolean;
  contextId: string;
  text: string;
  timelineId: string;
}

export const AuditdGenericDetails = React.memo<GenericDetailsProps>(
  ({ data, contextId, isDraggable, text, timelineId }) => {
    const id = data._id;
    const session: string | null | undefined = get('auditd.session[0]', data);
    const hostName: string | null | undefined = get('host.name[0]', data);
    const userName: string | null | undefined = get('user.name[0]', data);
    const result: string | null | undefined = get('auditd.result[0]', data);
    const processPid: number | null | undefined = get('process.pid[0]', data);
    const processName: string | null | undefined = get('process.name[0]', data);
    const processExecutable: string | null | undefined = get('process.executable[0]', data);
    const processTitle: string | null | undefined = get('process.title[0]', data);
    const workingDirectory: string | null | undefined = get('process.working_directory[0]', data);
    const primary: string | null | undefined = get('auditd.summary.actor.primary[0]', data);
    const secondary: string | null | undefined = get('auditd.summary.actor.secondary[0]', data);
    const args: string[] | null | undefined = get('process.args', data);
    console.log(session);
    if (data.process != null) {
      return (
        <Details>
          <AuditdGenericLine
            id={id}
            contextId={contextId}
            text={text}
            hostName={hostName}
            userName={userName}
            processName={processName}
            processPid={processPid}
            processExecutable={processExecutable}
            processTitle={processTitle}
            workingDirectory={workingDirectory}
            args={args}
            session={session}
            primary={primary}
            result={result}
            secondary={secondary}
            isDraggable={isDraggable}
          />
          <EuiSpacer size="s" />
          <NetflowRenderer data={data} isDraggable={isDraggable} timelineId={timelineId} />
        </Details>
      );
    } else {
      return null;
    }
  }
);

AuditdGenericDetails.displayName = 'AuditdGenericDetails';
