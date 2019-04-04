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
import { AuditdNetflow } from '../auditd_netflow';

import { Details, ProcessDraggable, TokensFlexItem, UserHostWorkingDir } from '.';
import * as i18n from './translations';

interface Props {
  id: string;
  hostName: string | null | undefined;
  outcome: string | null | undefined;
  userName: string | null | undefined;
  primary: string | null | undefined;
  contextId: string;
  text: string;
  secondary: string | null | undefined;
  processPid: string | null | undefined;
  processTitle: string | null | undefined;
  processName: string | null | undefined;
  message: string | null | undefined;
  processExecutable: string | null | undefined;
  workingDirectory: string | null | undefined;
  args: string | null | undefined;
  session: string | null | undefined;
}

export const SystemGenericLine = pure<Props>(
  ({
    id,
    contextId,
    hostName,
    userName,
    message,
    primary,
    secondary,
    processPid,
    processName,
    processExecutable,
    processTitle,
    workingDirectory,
    args,
    outcome,
    session,
    text,
  }) => (
    <>
      <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
        <UserHostWorkingDir
          contextId={contextId}
          eventId={id}
          userName={userName}
          hostName={hostName}
          workingDirectory={workingDirectory}
        />
        <TokensFlexItem grow={false} component="span">
          {text}
        </TokensFlexItem>
        <TokensFlexItem grow={false} component="span">
          <ProcessDraggable
            contextId={contextId}
            eventId={id}
            processPid={processPid}
            processName={processName}
            processExecutable={processExecutable}
          />
        </TokensFlexItem>
        {outcome != null && (
          <TokensFlexItem grow={false} component="span">
            {i18n.WITH_RESULT}
          </TokensFlexItem>
        )}
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            contextId={contextId}
            eventId={id}
            field="event.outcome"
            queryValue={outcome}
            value={outcome}
          />
        </TokensFlexItem>
      </EuiFlexGroup>
      {message != null && (
        <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
          <TokensFlexItem grow={false} component="span">
            <DraggableBadge
              contextId={contextId}
              eventId={id}
              field="message"
              queryValue={message}
              value={message}
            />
          </TokensFlexItem>
        </EuiFlexGroup>
      )}
    </>
  )
);

interface GenericDetailsProps {
  browserFields: BrowserFields;
  data: Ecs;
  contextId: string;
  text: string;
}

export const SystemGenericDetails = pure<GenericDetailsProps>(
  ({ browserFields, data, contextId, text }) => {
    // TODO: Do not check this in
    // console.log('data is:', JSON.stringify(data, null, 2));
    const id = data._id;
    // TODO: Get message to populate and show it below the other text
    const message: string | null = data.message != null ? data.message[0] : null;
    const hostName: string | null | undefined = get('host.name', data);
    const userName: string | null | undefined = get('user.name', data);
    const outcome: string | null | undefined = get('event.outcome', data);
    const processPid: string | null | undefined = get('process.pid', data);
    const processName: string | null | undefined = get('process.name', data);
    const processExecutable: string | null | undefined = get('process.executable', data);
    const processTitle: string | null | undefined = get('process.title', data);
    const workingDirectory: string | null | undefined = get('process.working_directory', data);
    const rawArgs: string[] | null | undefined = get('process.args', data);
    const args: string = rawArgs != null ? rawArgs.slice(1).join(' ') : '';
    // const primary: string | null | undefined = get('user.effective.name', data);
    // const secondary: string | null | undefined = get('auditd.summary.actor.secondary', data);
    // TODO: Do not check this in
    // console.log('outcome of the system is:', outcome);
    return (
      <Details>
        <SystemGenericLine
          id={id}
          contextId={contextId}
          text={text}
          message={message}
          hostName={hostName}
          userName={userName}
          processPid={processPid}
          processExecutable={processExecutable}
          processName={processName}
          processTitle={processTitle}
          workingDirectory={workingDirectory}
          args={args}
          session={undefined}
          primary={undefined}
          outcome={outcome}
          secondary={undefined}
        />
        <EuiSpacer size="s" />
        <AuditdNetflow data={data} />
      </Details>
    );
  }
);
