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

import { AuditdNetflow } from './auditd_netflow';
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
  processExecutable: string | null | undefined;
  processTitle: string | null | undefined;
  workingDirectory: string | null | undefined;
  args: string | null | undefined;
  session: string | null | undefined;
}

export const AuditdAcquiredLine = pure<Props>(
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
      <TokensFlexItem grow={false} component="span">
        {i18n.SESSION}
      </TokensFlexItem>
      <TokensFlexItem grow={false} component="span">
        <DraggableBadge
          contextId="auditd-acquired-creds"
          eventId={id}
          field="auditd.session"
          value={session}
          iconType="number"
        />
      </TokensFlexItem>
      <TokensFlexItem grow={false} component="span">
        <PrimarySecondaryUserInfo
          contextId="auditd-acquired-creds"
          eventId={id}
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
          contextId="auditd-acquired-creds"
          eventId={id}
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
          contextId="auditd-acquired-creds"
          eventId={id}
          field="process.working_directory"
          value={workingDirectory}
          iconType="folderOpen"
        />
      </TokensFlexItem>
      {processExecutable != null && (
        <TokensFlexItem grow={false} component="span">
          {i18n.ACQUIRED_CREDENTIALS_TO}
        </TokensFlexItem>
      )}
      <TokensFlexItem grow={false} component="span">
        <DraggableBadge
          contextId="auditd-acquired-creds"
          eventId={id}
          field="process.executable"
          value={processExecutable}
          iconType="console"
        />
      </TokensFlexItem>
      <TokensFlexItem grow={false} component="span">
        {args !== '' && (
          <DraggableBadge
            contextId="auditd-acquired-creds"
            eventId={id}
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
          <AuditdNetflow data={data} />
        </Details>
      );
    } else {
      return null;
    }
  }
);
