/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';

import { BrowserFields } from '../../../../../../common/containers/source';
import { Ecs } from '../../../../../../graphql/types';
import { DraggableBadge } from '../../../../../../common/components/draggables';
import { OverflowField } from '../../../../../../common/components/tables/helpers';

import * as i18n from './translations';
import { NetflowRenderer } from '../netflow';
import { UserHostWorkingDir } from '../user_host_working_dir';
import { Details, isProcessStoppedOrTerminationEvent, showVia, TokensFlexItem } from '../helpers';
import { ProcessDraggableWithNonExistentProcess } from '../process_draggable';
import { Args } from '../args';
import { AuthSsh } from './auth_ssh';
import { ExitCodeDraggable } from '../exit_code_draggable';
import { FileDraggable } from '../file_draggable';
import { Package } from './package';
import { Badge } from '../../../../../../common/components/page';
import { ParentProcessDraggable } from '../parent_process_draggable';
import { ProcessHash } from '../process_hash';

interface Props {
  args: string[] | null | undefined;
  contextId: string;
  endgameExitCode: string | null | undefined;
  endgameFileName: string | null | undefined;
  endgameFilePath: string | null | undefined;
  endgameParentProcessName: string | null | undefined;
  endgamePid: number | null | undefined;
  endgameProcessName: string | null | undefined;
  eventAction: string | null | undefined;
  fileName: string | null | undefined;
  filePath: string | null | undefined;
  hostName: string | null | undefined;
  id: string;
  message: string | null | undefined;
  outcome: string | null | undefined;
  packageName: string | null | undefined;
  packageSummary: string | null | undefined;
  packageVersion: string | null | undefined;
  processName: string | null | undefined;
  processPid: number | null | undefined;
  processPpid: number | null | undefined;
  processExecutable: string | null | undefined;
  processHashMd5: string | null | undefined;
  processHashSha1: string | null | undefined;
  processHashSha256: string | null | undefined;
  processTitle: string | null | undefined;
  showMessage: boolean;
  sshSignature: string | null | undefined;
  sshMethod: string | null | undefined;
  text: string | null | undefined;
  userDomain: string | null | undefined;
  userName: string | null | undefined;
  workingDirectory: string | null | undefined;
}

export const SystemGenericFileLine = React.memo<Props>(
  ({
    args,
    contextId,
    endgameExitCode,
    endgameFileName,
    endgameFilePath,
    endgameParentProcessName,
    endgamePid,
    endgameProcessName,
    eventAction,
    fileName,
    filePath,
    hostName,
    id,
    message,
    outcome,
    packageName,
    packageSummary,
    packageVersion,
    processExecutable,
    processHashMd5,
    processHashSha1,
    processHashSha256,
    processName,
    processPid,
    processPpid,
    processTitle,
    showMessage,
    sshSignature,
    sshMethod,
    text,
    userDomain,
    userName,
    workingDirectory,
  }) => (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="none" wrap={true}>
        <UserHostWorkingDir
          eventId={id}
          contextId={contextId}
          userDomain={userDomain}
          userName={userName}
          workingDirectory={workingDirectory}
          hostName={hostName}
        />
        <TokensFlexItem grow={false} component="span">
          {text}
        </TokensFlexItem>
        <FileDraggable
          contextId={contextId}
          endgameFileName={endgameFileName}
          endgameFilePath={endgameFilePath}
          eventId={id}
          fileName={fileName}
          filePath={filePath}
        />
        {showVia(eventAction) && (
          <TokensFlexItem data-test-subj="via" grow={false} component="span">
            {i18n.VIA}
          </TokensFlexItem>
        )}
        <TokensFlexItem grow={false} component="span">
          <ProcessDraggableWithNonExistentProcess
            contextId={contextId}
            endgamePid={endgamePid}
            endgameProcessName={endgameProcessName}
            eventId={id}
            processPid={processPid}
            processName={processName}
            processExecutable={processExecutable}
          />
        </TokensFlexItem>
        <Args args={args} contextId={contextId} eventId={id} processTitle={processTitle} />
        <ExitCodeDraggable
          contextId={contextId}
          endgameExitCode={endgameExitCode}
          eventId={id}
          text={i18n.WITH_EXIT_CODE}
        />
        {!isProcessStoppedOrTerminationEvent(eventAction) && (
          <ParentProcessDraggable
            contextId={contextId}
            endgameParentProcessName={endgameParentProcessName}
            eventId={id}
            processPpid={processPpid}
            text={i18n.VIA_PARENT_PROCESS}
          />
        )}
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
      <ProcessHash
        contextId={contextId}
        eventId={id}
        processHashMd5={processHashMd5}
        processHashSha1={processHashSha1}
        processHashSha256={processHashSha256}
      />

      {message != null && showMessage && (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexGroup justifyContent="center" gutterSize="none" wrap={true}>
            <TokensFlexItem grow={false} component="span">
              <Badge iconType="editorComment" color="hollow" title="">
                <OverflowField value={message} />
              </Badge>
            </TokensFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  )
);

SystemGenericFileLine.displayName = 'SystemGenericFileLine';

interface GenericDetailsProps {
  browserFields: BrowserFields;
  data: Ecs;
  contextId: string;
  showMessage?: boolean;
  text: string;
  timelineId: string;
}

export const SystemGenericFileDetails = React.memo<GenericDetailsProps>(
  ({ data, contextId, showMessage = true, text, timelineId }) => {
    const id = data._id;
    const message: string | null = data.message != null ? data.message[0] : null;
    const hostName: string | null | undefined = get('host.name[0]', data);
    const endgameExitCode: string | null | undefined = get('endgame.exit_code[0]', data);
    const endgameFileName: string | null | undefined = get('endgame.file_name[0]', data);
    const endgameFilePath: string | null | undefined = get('endgame.file_path[0]', data);
    const endgameParentProcessName: string | null | undefined = get(
      'endgame.parent_process_name[0]',
      data
    );
    const endgamePid: number | null | undefined = get('endgame.pid[0]', data);
    const endgameProcessName: string | null | undefined = get('endgame.process_name[0]', data);
    const eventAction: string | null | undefined = get('event.action[0]', data);
    const fileName: string | null | undefined = get('file.name[0]', data);
    const filePath: string | null | undefined = get('file.path[0]', data);
    const userDomain: string | null | undefined = get('user.domain[0]', data);
    const userName: string | null | undefined = get('user.name[0]', data);
    const outcome: string | null | undefined = get('event.outcome[0]', data);
    const packageName: string | null | undefined = get('system.audit.package.name[0]', data);
    const packageSummary: string | null | undefined = get('system.audit.package.summary[0]', data);
    const packageVersion: string | null | undefined = get('system.audit.package.version[0]', data);
    const processHashMd5: string | null | undefined = get('process.hash.md5[0]', data);
    const processHashSha1: string | null | undefined = get('process.hash.sha1[0]', data);
    const processHashSha256: string | null | undefined = get('process.hash.sha256', data);
    const processPid: number | null | undefined = get('process.pid[0]', data);
    const processPpid: number | null | undefined = get('process.ppid[0]', data);
    const processName: string | null | undefined = get('process.name[0]', data);
    const sshSignature: string | null | undefined = get('system.auth.ssh.signature[0]', data);
    const sshMethod: string | null | undefined = get('system.auth.ssh.method[0]', data);
    const processExecutable: string | null | undefined = get('process.executable[0]', data);
    const processTitle: string | null | undefined = get('process.title[0]', data);
    const workingDirectory: string | null | undefined = get('process.working_directory[0]', data);
    const args: string[] | null | undefined = get('process.args', data);

    return (
      <Details>
        <SystemGenericFileLine
          id={id}
          contextId={contextId}
          text={text}
          hostName={hostName}
          endgameExitCode={endgameExitCode}
          endgameFileName={endgameFileName}
          endgameFilePath={endgameFilePath}
          endgameParentProcessName={endgameParentProcessName}
          endgamePid={endgamePid}
          endgameProcessName={endgameProcessName}
          eventAction={eventAction}
          fileName={fileName}
          filePath={filePath}
          userDomain={userDomain}
          userName={userName}
          message={message}
          processTitle={processTitle}
          workingDirectory={workingDirectory}
          args={args}
          packageName={packageName}
          packageSummary={packageSummary}
          packageVersion={packageVersion}
          processHashMd5={processHashMd5}
          processHashSha1={processHashSha1}
          processHashSha256={processHashSha256}
          processName={processName}
          processPid={processPid}
          processPpid={processPpid}
          processExecutable={processExecutable}
          showMessage={showMessage}
          sshSignature={sshSignature}
          sshMethod={sshMethod}
          outcome={outcome}
        />
        <EuiSpacer size="s" />
        <NetflowRenderer data={data} timelineId={timelineId} />
      </Details>
    );
  }
);

SystemGenericFileDetails.displayName = 'SystemGenericFileDetails';
