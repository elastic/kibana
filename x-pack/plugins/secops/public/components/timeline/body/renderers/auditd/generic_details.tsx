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

import { Args, Details, SessionUserHostWorkingDir, TokensFlexItem } from '.';
import * as i18n from './translations';

interface Props {
  id: string;
  hostName: string | null | undefined;
  result: string | null | undefined;
  userName: string | null | undefined;
  primary: string | null | undefined;
  contextId: string;
  text: string;
  secondary: string | null | undefined;
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
    secondary,
    processExecutable,
    processTitle,
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
        <DraggableBadge
          contextId={contextId}
          eventId={id}
          field="process.executable"
          value={processExecutable}
          iconType="console"
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
          contextId="auditd-loggedin"
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

export const AuditdGenericDetails = pure<GenericDetailsProps>(
  ({ browserFields, data, contextId, text }) => {
    const id = data._id;
    const session: string | null | undefined = get('auditd.session', data);
    const hostName: string | null | undefined = get('host.name', data);
    const userName: string | null | undefined = get('user.name', data);
    const result: string | null | undefined = get('auditd.result', data);
    const processExecutable: string | null | undefined = get('process.executable', data);
    const processTitle: string | null | undefined = get('process.title', data);
    const workingDirectory: string | null | undefined = get('process.working_directory', data);
    const primary: string | null | undefined = get('auditd.summary.actor.primary', data);
    const secondary: string | null | undefined = get('auditd.summary.actor.secondary', data);
    const rawArgs: string[] | null | undefined = get('process.args', data);
    const args: string = rawArgs != null ? rawArgs.slice(1).join(' ') : '';
    if (data.process != null) {
      return (
        <Details>
          <AuditdGenericLine
            id={id}
            contextId={contextId}
            text={text}
            hostName={hostName}
            userName={userName}
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
          <AuditdNetflow data={data} />
        </Details>
      );
    } else {
      return null;
    }
  }
);
