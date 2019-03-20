/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { get } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { Ecs } from '../../../../graphql/types';
import { DraggableBadge } from '../../../draggables';

import { PrimarySecondaryUserInfo } from './primary_secondary_user_info';

import * as i18n from './translations';

const Details = styled.div`
  margin: 10px 0px 10px 10px;
`;

const TokensFlexItem = styled(EuiFlexItem)`
  margin-left: 3px;
`;

interface Props {
  id: string;
  hostName: string | null | undefined;
  userName: string | null | undefined;
  primary: string | null | undefined;
  secondary: string | null | undefined;
  processName: string | null | undefined;
  processTitle: string | null | undefined;
  workingDirectory: string | null | undefined;
  args: string | null | undefined;
  session: string | null | undefined;
}

export const AuditdExecutedCommandLine = pure<Props>(
  ({
    id,
    hostName,
    userName,
    primary,
    secondary,
    processName,
    processTitle,
    workingDirectory,
    args,
    session,
  }) => (
    <Details>
      <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
        <TokensFlexItem grow={false} component="span">
          {i18n.SESSION}
        </TokensFlexItem>
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            eventId={`auditd-executed-element-${id}`}
            field="auditd.session"
            value={session}
            iconType="number"
          />
        </TokensFlexItem>
        <TokensFlexItem grow={false} component="span">
          <PrimarySecondaryUserInfo
            eventId={`auditd-executed-element-${id}`}
            userName={userName}
            primary={primary}
            secondary={secondary}
          />
        </TokensFlexItem>
        {hostName != null && (
          <TokensFlexItem grow={false} component="span">
            @
          </TokensFlexItem>
        )}
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            eventId={`auditd-executed-element-${id}`}
            field="host.name"
            value={hostName}
          />
        </TokensFlexItem>
        {workingDirectory != null && (
          <TokensFlexItem grow={false} component="span">
            {i18n.IN}
          </TokensFlexItem>
        )}
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            eventId={`auditd-executed-element-${id}`}
            field="process.working_directory"
            value={workingDirectory}
            iconType="folderOpen"
          />
        </TokensFlexItem>
        {processName != null && (
          <TokensFlexItem grow={false} component="span">
            {i18n.EXECUTED}
          </TokensFlexItem>
        )}
        <TokensFlexItem grow={false} component="span">
          <DraggableBadge
            eventId={`auditd-executed-element-${id}`}
            field="process.name"
            value={processName}
            iconType="console"
          />
        </TokensFlexItem>
        <TokensFlexItem grow={false} component="span">
          {args !== '' && (
            <DraggableBadge
              eventId={`auditd-executed-element-${id}`}
              field="process.title"
              queryValue={processTitle != null ? processTitle : ''}
              value={args}
            />
          )}
        </TokensFlexItem>
      </EuiFlexGroup>
    </Details>
  )
);

export const AuditdExecutedDetails = pure<{ data: Ecs }>(({ data }) => {
  const id = data._id;
  const session: string | null | undefined = get('auditd.session', data);
  const hostName: string | null | undefined = get('host.name', data);
  const userName: string | null | undefined = get('user.name', data);
  const processName: string | null | undefined = get('process.name', data);
  const processTitle: string | null | undefined = get('process.title', data);
  const workingDirectory: string | null | undefined = get('process.working_directory', data);
  const primary: string | null | undefined = get('auditd.summary.actor.primary', data);
  const secondary: string | null | undefined = get('auditd.summary.actor.secondary', data);
  const rawArgs: string[] | null | undefined = get('process.args', data);
  const args: string = rawArgs != null ? rawArgs.slice(1).join(' ') : '';
  if (data.process != null) {
    return (
      <AuditdExecutedCommandLine
        id={id}
        hostName={hostName}
        userName={userName}
        processName={processName}
        processTitle={processTitle}
        workingDirectory={workingDirectory}
        args={args}
        session={session}
        primary={primary}
        secondary={secondary}
      />
    );
  } else {
    return null;
  }
});
