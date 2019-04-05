/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { IconType } from '@elastic/eui';
import { get } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';

import { Args } from '..';
import { BrowserFields } from '../../../../../containers/source';
import { Ecs } from '../../../../../graphql/types';
import { DraggableBadge } from '../../../../draggables';
import { AuditdNetflow } from '../auditd_netflow';

import {
  AuthSsh,
  Details,
  Package,
  ProcessDraggableWithNonExistentProcess,
  TokensFlexItem,
  UserHostWorkingDir,
} from '.';

import * as i18n from './translations';

interface Props {
  id: string;
  hostName: string | null | undefined;
  userName: string | null | undefined;
  message: string | null | undefined;
  packageName: string | null | undefined;
  packageSummary: string | null | undefined;
  packageVersion: string | null | undefined;
  processName: string | null | undefined;
  processPid: string | null | undefined;
  processExecutable: string | null | undefined;
  sshSignature: string | null | undefined;
  sshMethod: string | null | undefined;
  outcome: string | null | undefined;
  primary: string | null | undefined;
  fileIcon: IconType;
  contextId: string;
  text: string;
  secondary: string | null | undefined;
  filePath: string | null | undefined;
  processTitle: string | null | undefined;
  workingDirectory: string | null | undefined;
  args: string | null | undefined;
  session: string | null | undefined;
}

export const SystemGenericFileLine = pure<Props>(
  ({
    id,
    contextId,
    hostName,
    userName,
    outcome,
    primary,
    secondary,
    filePath,
    message,
    packageName,
    packageSummary,
    packageVersion,
    processPid,
    processName,
    processTitle,
    sshSignature,
    sshMethod,
    processExecutable,
    workingDirectory,
    args,
    session,
    text,
    fileIcon,
  }) => (
    <>
      <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
        <UserHostWorkingDir
          eventId={id}
          contextId={contextId}
          userName={userName}
          workingDirectory={workingDirectory}
          hostName={hostName}
        />
        <TokensFlexItem grow={false} component="span">
          {text}
        </TokensFlexItem>
        <TokensFlexItem grow={false} component="span">
          <ProcessDraggableWithNonExistentProcess
            contextId={contextId}
            eventId={id}
            processPid={processPid}
            processName={processName}
            processExecutable={processExecutable}
          />
        </TokensFlexItem>
        <Args eventId={id} args={args} contextId={contextId} processTitle={processTitle} />
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
        <AuthSsh
          contextId={contextId}
          eventId={id}
          sshSignature={sshSignature}
          sshMethod={sshMethod}
        />
        <Package
          contextId={contextId}
          eventId={id}
          packageName={packageName}
          packageSummary={packageSummary}
          packageVersion={packageVersion}
        />
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
  fileIcon: IconType;
}

export const SystemGenericFileDetails = pure<GenericDetailsProps>(
  ({ browserFields, data, contextId, text, fileIcon = 'document' }) => {
    const id = data._id;
    const session: string | null | undefined = get('auditd.session', data);
    // TODO: Get message to populate and show it below the other text
    const message: string | null = data.message != null ? data.message[0] : null;
    const hostName: string | null | undefined = get('host.name', data);
    const userName: string | null | undefined = get('user.name', data);
    const outcome: string | null | undefined = get('event.outcome', data);
    const packageName: string | null | undefined = get('system.audit.package.name', data);
    const packageSummary: string | null | undefined = get('system.audit.package.summary', data);
    const packageVersion: string | null | undefined = get('system.audit.package.version', data);
    const processPid: string | null | undefined = get('process.pid', data);
    const processName: string | null | undefined = get('process.name', data);
    const sshSignature: string | null | undefined = get('system.auth.ssh.signature', data);
    const sshMethod: string | null | undefined = get('system.auth.ssh.method', data);
    const processExecutable: string | null | undefined = get('process.executable', data);
    const processTitle: string | null | undefined = get('process.title', data);
    const workingDirectory: string | null | undefined = get('process.working_directory', data);
    const filePath: string | null | undefined = get('file.path', data);
    const primary: string | null | undefined = get('auditd.summary.actor.primary', data);
    const secondary: string | null | undefined = get('auditd.summary.actor.secondary', data);
    const rawArgs: string[] | null | undefined = get('process.args', data);
    const args: string = rawArgs != null ? rawArgs.slice(1).join(' ') : '';
    return (
      <Details>
        <SystemGenericFileLine
          id={id}
          contextId={contextId}
          text={text}
          hostName={hostName}
          userName={userName}
          filePath={filePath}
          message={message}
          processTitle={processTitle}
          workingDirectory={workingDirectory}
          args={args}
          session={session}
          packageName={packageName}
          packageSummary={packageSummary}
          packageVersion={packageVersion}
          primary={primary}
          processName={processName}
          processPid={processPid}
          processExecutable={processExecutable}
          sshSignature={sshSignature}
          sshMethod={sshMethod}
          secondary={secondary}
          fileIcon={fileIcon}
          outcome={outcome}
        />
        <EuiSpacer size="s" />
        <AuditdNetflow data={data} />
      </Details>
    );
  }
);
