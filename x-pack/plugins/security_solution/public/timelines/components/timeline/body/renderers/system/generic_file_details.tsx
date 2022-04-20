/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { get } from 'lodash/fp';
import React from 'react';

import { Ecs } from '../../../../../../../common/ecs';
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
import { FileHash } from '../file_hash';
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
  fileExtOriginalPath: string | null | undefined;
  fileHashSha256: string | null | undefined;
  fileName: string | null | undefined;
  filePath: string | null | undefined;
  hostName: string | null | undefined;
  id: string;
  isDraggable?: boolean;
  message: string | null | undefined;
  outcome: string | null | undefined;
  packageName: string | null | undefined;
  packageSummary: string | null | undefined;
  packageVersion: string | null | undefined;
  processName: string | null | undefined;
  processParentName: string | null | undefined;
  processParentPid: number | null | undefined;
  processExitCode: number | null | undefined;
  processPid: number | null | undefined;
  processPpid: number | null | undefined;
  processExecutable: string | null | undefined;
  processHashSha256: string | null | undefined;
  processTitle: string | null | undefined;
  showMessage: boolean;
  skipRedundantFileDetails?: boolean;
  skipRedundantProcessDetails?: boolean;
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
    fileExtOriginalPath,
    fileHashSha256,
    fileName,
    filePath,
    hostName,
    id,
    isDraggable,
    message,
    outcome,
    packageName,
    processParentName,
    processParentPid,
    processExitCode,
    packageSummary,
    packageVersion,
    processExecutable,
    processHashSha256,
    processName,
    processPid,
    processPpid,
    processTitle,
    showMessage,
    skipRedundantFileDetails = false,
    skipRedundantProcessDetails = false,
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
          isDraggable={isDraggable}
          userDomain={userDomain}
          userName={userName}
          workingDirectory={workingDirectory}
          hostName={hostName}
        />
        <TokensFlexItem grow={false} component="span">
          {text}
        </TokensFlexItem>

        {!skipRedundantFileDetails && (
          <FileDraggable
            contextId={contextId}
            endgameFileName={endgameFileName}
            endgameFilePath={endgameFilePath}
            eventId={id}
            fileExtOriginalPath={fileExtOriginalPath}
            fileName={fileName}
            filePath={filePath}
            isDraggable={isDraggable}
          />
        )}
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
            isDraggable={isDraggable}
            processPid={processPid}
            processName={processName}
            processExecutable={processExecutable}
          />
        </TokensFlexItem>
        <Args
          args={args}
          contextId={contextId}
          eventId={id}
          processTitle={processTitle}
          isDraggable={isDraggable}
        />
        <ExitCodeDraggable
          contextId={contextId}
          endgameExitCode={endgameExitCode}
          eventId={id}
          isDraggable={isDraggable}
          processExitCode={processExitCode}
          text={i18n.WITH_EXIT_CODE}
        />
        {!isProcessStoppedOrTerminationEvent(eventAction) && (
          <ParentProcessDraggable
            contextId={contextId}
            endgameParentProcessName={endgameParentProcessName}
            eventId={id}
            isDraggable={isDraggable}
            processParentName={processParentName}
            processParentPid={processParentPid}
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
            isDraggable={isDraggable}
            queryValue={outcome}
            value={outcome}
          />
        </TokensFlexItem>
        <AuthSsh
          contextId={contextId}
          eventId={id}
          isDraggable={isDraggable}
          sshSignature={sshSignature}
          sshMethod={sshMethod}
        />
        <Package
          contextId={contextId}
          eventId={id}
          isDraggable={isDraggable}
          packageName={packageName}
          packageSummary={packageSummary}
          packageVersion={packageVersion}
        />
      </EuiFlexGroup>
      {!skipRedundantFileDetails && (
        <FileHash
          contextId={contextId}
          eventId={id}
          fileHashSha256={fileHashSha256}
          isDraggable={isDraggable}
        />
      )}
      {!skipRedundantProcessDetails && (
        <ProcessHash
          contextId={contextId}
          eventId={id}
          isDraggable={isDraggable}
          processHashSha256={processHashSha256}
        />
      )}

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
  contextId: string;
  data: Ecs;
  isDraggable?: boolean;
  showMessage?: boolean;
  skipRedundantFileDetails?: boolean;
  skipRedundantProcessDetails?: boolean;
  text: string;
  timelineId: string;
}

export const SystemGenericFileDetails = React.memo<GenericDetailsProps>(
  ({
    contextId,
    data,
    isDraggable,
    showMessage = true,
    skipRedundantFileDetails = false,
    skipRedundantProcessDetails = false,
    text,
    timelineId,
  }) => {
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
    const fileExtOriginalPath: string | null | undefined = get('file.Ext.original.path[0]', data);
    const fileHashSha256: string | null | undefined = get('file.hash.sha256[0]', data);
    const fileName: string | null | undefined = get('file.name[0]', data);
    const filePath: string | null | undefined = get('file.path[0]', data);
    const userDomain: string | null | undefined = get('user.domain[0]', data);
    const userName: string | null | undefined = get('user.name[0]', data);
    const outcome: string | null | undefined = get('event.outcome[0]', data);
    const packageName: string | null | undefined = get('system.audit.package.name[0]', data);
    const packageSummary: string | null | undefined = get('system.audit.package.summary[0]', data);
    const packageVersion: string | null | undefined = get('system.audit.package.version[0]', data);
    const processExitCode: number | null | undefined = get('process.exit_code[0]', data);
    const processParentName: string | null | undefined = get('process.parent.name[0]', data);
    const processParentPid: number | null | undefined = get('process.parent.pid[0]', data);
    const processHashSha256: string | null | undefined = get('process.hash.sha256[0]', data);
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
          fileExtOriginalPath={fileExtOriginalPath}
          fileHashSha256={fileHashSha256}
          fileName={fileName}
          filePath={filePath}
          userDomain={userDomain}
          userName={userName}
          message={message}
          processExitCode={processExitCode}
          processParentName={processParentName}
          processParentPid={processParentPid}
          processTitle={processTitle}
          workingDirectory={workingDirectory}
          args={args}
          packageName={packageName}
          packageSummary={packageSummary}
          packageVersion={packageVersion}
          processHashSha256={processHashSha256}
          processName={processName}
          processPid={processPid}
          processPpid={processPpid}
          processExecutable={processExecutable}
          showMessage={showMessage}
          skipRedundantFileDetails={skipRedundantFileDetails}
          skipRedundantProcessDetails={skipRedundantProcessDetails}
          sshSignature={sshSignature}
          sshMethod={sshMethod}
          outcome={outcome}
          isDraggable={isDraggable}
        />
        <EuiSpacer size="s" />
        <NetflowRenderer data={data} isDraggable={isDraggable} timelineId={timelineId} />
      </Details>
    );
  }
);

SystemGenericFileDetails.displayName = 'SystemGenericFileDetails';
