/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';

import { BrowserFields } from '../../../../../containers/source';
import { Ecs } from '../../../../../graphql/types';
import { DraggableBadge } from '../../../../draggables';

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
  args: string | null | undefined;
  session: string | null | undefined;
}

export const AuditdGenericLine = pure<Props>(
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
  }) => (
    <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
      <SessionUserHostWorkingDir
        eventId={id}
        contextId={contextId}
        hostName={hostName}
        userName={userName}
        primary={primary}
        secondary={secondary}
        workingDirectory={workingDirectory}
        session={session}
      />
      {processExecutable != null && (
        <TokensFlexItem grow={false} component="span">
          {text}
        </TokensFlexItem>
      )}
      <TokensFlexItem grow={false} component="span">
        <ProcessDraggable
          contextId={contextId}
          eventId={id}
          processPid={processPid}
          processName={processName}
          processExecutable={processExecutable}
        />
      </TokensFlexItem>
      <Args eventId={id} args={args} contextId={contextId} processTitle={processTitle} />
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
          queryValue={result}
          value={result}
        />
      </TokensFlexItem>
    </EuiFlexGroup>
  )
);

interface GenericDetailsProps {
  browserFields: BrowserFields;
  data: Ecs;
  contextId: string;
  text: string;
}

export const AuditdGenericDetails = pure<GenericDetailsProps>(({ data, contextId, text }) => {
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
  const rawArgs: string[] | null | undefined = get('process.args', data);
  const args: string | null = rawArgs != null ? rawArgs.slice(1).join(' ') : null;
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
        />
        <EuiSpacer size="s" />
        <NetflowRenderer data={data} />
      </Details>
    );
  } else {
    return null;
  }
});
