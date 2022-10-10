/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventAction, Process, ProcessFields, Teletype } from '../../../common/types/process_tree';
import { DetailPanelProcess, DetailPanelProcessLeader } from '../../types';
import { DASH } from '../../constants';
import { dataOrDash } from '../../utils/data_or_dash';

const FILTER_FORKS_EXECS = [EventAction.fork, EventAction.exec];

const DEFAULT_PROCESS_DATA: DetailPanelProcessLeader = {
  id: DASH,
  name: DASH,
  start: DASH,
  end: DASH,
  exitCode: DASH,
  userName: DASH,
  groupName: DASH,
  workingDirectory: DASH,
  interactive: DASH,
  args: DASH,
  pid: DASH,
  entryMetaType: DASH,
  entryMetaSourceIp: DASH,
  executable: [[DASH]],
};

/**
 * Serialize an array of executable tuples to a copyable text.
 *
 * @param  {String[][]} executable
 * @return {String} serialized string with data of each executable
 */
export const getProcessExecutableCopyText = (executable: string[][]): string => {
  try {
    return executable
      .map((execTuple) => {
        const [execCommand, eventAction] = execTuple;
        if (!execCommand || !eventAction || execTuple.length !== 2) {
          throw new Error();
        }
        return `${execCommand} ${eventAction}`;
      })
      .join(', ');
  } catch (_) {
    return '';
  }
};

/**
 * Format an array of args for display.
 *
 * @param  {String[] | undefined} args
 * @return {String} formatted string of process args
 */
export const formatProcessArgs = (args: string[] | undefined): string =>
  args && args.length && args.map ? `[${args.map((arg) => `'${arg}'`).join(', ')}]` : DASH;

/**
 * Get isInteractive boolean string from tty.
 *
 * @param  {Teletype | undefined} tty
 * @return {String} returns 'True' if tty exists, 'False' otherwise.
 */
export const getIsInterativeString = (tty: Teletype | undefined): string =>
  !!tty ? 'True' : 'False';

const getDetailPanelProcessLeader = (
  leader: ProcessFields | undefined
): DetailPanelProcessLeader => ({
  ...leader,
  id: leader?.entity_id ?? DEFAULT_PROCESS_DATA.id,
  name: leader?.name ?? DEFAULT_PROCESS_DATA.name,
  start: leader?.start ?? DEFAULT_PROCESS_DATA.start,
  end: leader?.end ?? DEFAULT_PROCESS_DATA.end,
  exitCode: leader?.exit_code?.toString() ?? DEFAULT_PROCESS_DATA.exitCode,
  interactive: getIsInterativeString(leader?.tty),
  userName: leader?.user?.name ?? DEFAULT_PROCESS_DATA.userName,
  groupName: leader?.group?.name ?? DEFAULT_PROCESS_DATA.groupName,
  workingDirectory: leader?.working_directory ?? DEFAULT_PROCESS_DATA.workingDirectory,
  args: formatProcessArgs(leader?.args) ?? DEFAULT_PROCESS_DATA.args,
  pid: leader?.pid?.toString() ?? DEFAULT_PROCESS_DATA.pid,
  // TODO: get the event action of leader
  executable: leader?.executable ? [[leader?.executable]] : DEFAULT_PROCESS_DATA.executable,
  entryMetaType: leader?.entry_meta?.type ?? DEFAULT_PROCESS_DATA.entryMetaType,
  entryMetaSourceIp: leader?.entry_meta?.source?.ip ?? DEFAULT_PROCESS_DATA.entryMetaSourceIp,
});

export const getDetailPanelProcess = (process: Process | null): DetailPanelProcess => {
  const processData = {
    id: DEFAULT_PROCESS_DATA.id,
    start: DEFAULT_PROCESS_DATA.start,
    end: DEFAULT_PROCESS_DATA.end,
    exitCode: DEFAULT_PROCESS_DATA.exitCode,
    interactive: DEFAULT_PROCESS_DATA.interactive,
    userName: DEFAULT_PROCESS_DATA.userName,
    groupName: DEFAULT_PROCESS_DATA.groupName,
    args: DEFAULT_PROCESS_DATA.args,
    pid: DEFAULT_PROCESS_DATA.pid,
    executable: DEFAULT_PROCESS_DATA.executable,
    workingDirectory: DEFAULT_PROCESS_DATA.workingDirectory,
    entryLeader: DEFAULT_PROCESS_DATA,
    sessionLeader: DEFAULT_PROCESS_DATA,
    groupLeader: DEFAULT_PROCESS_DATA,
    parent: DEFAULT_PROCESS_DATA,
  } as DetailPanelProcess;
  if (!process) {
    return processData;
  }

  const details = process.getDetails();

  processData.id = `${dataOrDash(process.id)}`;
  processData.start = `${dataOrDash(details.process?.start)}`;
  processData.end = `${dataOrDash(process.getEndTime())}`;
  processData.exitCode = `${dataOrDash(details.process?.exit_code)}`;
  processData.interactive = getIsInterativeString(details.process?.tty);
  processData.userName = `${dataOrDash(details.process?.user?.name)}`;
  processData.groupName = `${dataOrDash(details.process?.group?.name)}`;
  processData.pid = `${dataOrDash(details.process?.pid)}`;
  processData.workingDirectory = `${dataOrDash(details.process?.working_directory)}`;
  if (details.process?.args) {
    processData.args = formatProcessArgs(details.process.args);
  }

  // we grab the executable from each process lifecycle event to give an indication
  // of the processes journey. Processes can sometimes exec multiple times, so it's good
  // information to have.
  processData.executable = [];
  process.events.forEach((event) => {
    if (
      event.process?.executable &&
      event.event?.action &&
      FILTER_FORKS_EXECS.includes(event.event.action)
    ) {
      processData.executable.push([event.process.executable, `(${event.event.action})`]);
    }
  });
  if (!processData.executable.length) {
    // if there were no forks, execs (due to bad data), check if we at least have an executable for some event
    const executable = process.getDetails().process?.executable;

    if (executable) {
      processData.executable.push([executable]);
    } else {
      processData.executable = DEFAULT_PROCESS_DATA.executable;
    }
  }

  processData.entryLeader = getDetailPanelProcessLeader(details?.process?.entry_leader);
  processData.sessionLeader = getDetailPanelProcessLeader(details?.process?.session_leader);
  processData.groupLeader = getDetailPanelProcessLeader(details?.process?.group_leader);
  processData.parent = getDetailPanelProcessLeader(details?.process?.parent);

  return processData;
};
