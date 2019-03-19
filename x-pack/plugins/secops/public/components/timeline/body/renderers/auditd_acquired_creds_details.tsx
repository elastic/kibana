/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { BrowserFields } from '../../../../containers/source';
import { Ecs } from '../../../../graphql/types';
import { DraggableBadge } from '../../../draggables';

import { PrimarySecondaryUserInfo } from './primary_secondary_user_info';
import { SourceDest } from './source_dest_ip';

const Details = styled.div`
  margin-left: 10px;
  margin-top: 10px;
  margin-bottom: 10px;
`;

const TokensFlexItem = styled(EuiFlexItem)`
  margin-left: 3px;
`;

export const AuditdAcquiredLine = pure<{
  id: string;
  hostName: string | null | undefined;
  userName: string | null | undefined;
  primary: string | null | undefined;
  secondary: string | null | undefined;
  processExecutable: string | null | undefined;
  processTitle: string | null | undefined;
  workingDirectory: string | null | undefined;
  args: string | null | undefined;
  session: string | null | undefined;
}>(
  ({
    id,
    hostName,
    userName,
    primary,
    secondary,
    processExecutable,
    processTitle,
    workingDirectory,
    args,
    session,
  }) => (
    <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
      <TokensFlexItem grow={false}>Session</TokensFlexItem>
      <TokensFlexItem grow={false}>
        <DraggableBadge
          id={`auditd-acquired-creds-${id}`}
          field="auditd.session"
          value={session}
          iconType="number"
        />
      </TokensFlexItem>
      <TokensFlexItem grow={false}>
        <PrimarySecondaryUserInfo
          id={`auditd-acquired-creds-${id}`}
          userName={userName}
          primary={primary}
          secondary={secondary}
        />
      </TokensFlexItem>
      {hostName != null && <TokensFlexItem grow={false}>@</TokensFlexItem>}
      <TokensFlexItem grow={false}>
        <DraggableBadge id={`auditd-acquired-creds-${id}`} field="host.name" value={hostName} />
      </TokensFlexItem>
      {workingDirectory != null && <TokensFlexItem grow={false}>in</TokensFlexItem>}
      <TokensFlexItem grow={false}>
        <DraggableBadge
          id={`auditd-acquired-creds-${id}`}
          field="process.working_directory"
          value={workingDirectory}
          iconType="folderOpen"
        />
      </TokensFlexItem>
      {processExecutable != null && (
        <TokensFlexItem grow={false}>acquired credentials to</TokensFlexItem>
      )}
      <TokensFlexItem grow={false}>
        <DraggableBadge
          id={`auditd-acquired-creds-${id}`}
          field="process.executable"
          value={processExecutable}
          iconType="console"
        />
      </TokensFlexItem>
      <TokensFlexItem grow={false}>
        {args !== '' && (
          <DraggableBadge
            id={`auditd-acquired-creds-${id}`}
            field="process.title"
            queryValue={processTitle != null ? processTitle : ''}
            value={args}
          />
        )}
      </TokensFlexItem>
    </EuiFlexGroup>
  )
);

export const AuditdAcquiredDetails = pure<{ browserFields: BrowserFields; data: Ecs }>(
  ({ browserFields, data }) => {
    const id = data._id;
    const session: string | null | undefined = get('auditd.session', data);
    const hostName: string | null | undefined = get('host.name', data);
    const userName: string | null | undefined = get('user.name', data);
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
          <AuditdAcquiredLine
            id={id}
            hostName={hostName}
            userName={userName}
            processExecutable={processExecutable}
            processTitle={processTitle}
            workingDirectory={workingDirectory}
            args={args}
            session={session}
            primary={primary}
            secondary={secondary}
          />
          <EuiSpacer size="s" />
          <SourceDest data={data} browserFields={browserFields} />
        </Details>
      );
    } else {
      return null;
    }
  }
);
