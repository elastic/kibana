/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EventAction, Process, ProcessFields } from '../../../common/types/process_tree';
import { DetailPanelProcess, EuiTabProps } from '../../types';
import { dataOrDash } from '../../utils/data_or_dash';

const FILTER_FORKS_EXECS = [EventAction.fork, EventAction.exec];

const DEFAULT_PROCESS_DATA = {
  id: '',
  name: '',
  start: '',
  end: '',
  exit_code: -1,
  userName: '',
  groupName: '',
  working_directory: '',
  args: [],
  pid: -1,
  entryMetaType: '',
  entryMetaSourceIp: '',
  executable: '',
};

const getDetailPanelProcessLeader = (leader: ProcessFields | undefined) => ({
  ...leader,
  name: leader?.name ?? DEFAULT_PROCESS_DATA.name,
  start: leader?.start ?? DEFAULT_PROCESS_DATA.start,
  working_directory: leader?.working_directory ?? DEFAULT_PROCESS_DATA.working_directory,
  args: leader?.args ?? DEFAULT_PROCESS_DATA.args,
  pid: leader?.pid ?? DEFAULT_PROCESS_DATA.pid,
  executable: leader?.executable ?? DEFAULT_PROCESS_DATA.executable,
  id: leader?.entity_id ?? DEFAULT_PROCESS_DATA.id,
  entryMetaType: leader?.entry_meta?.type ?? DEFAULT_PROCESS_DATA.entryMetaType,
  userName: leader?.user?.name ?? DEFAULT_PROCESS_DATA.userName,
  groupName: leader?.group?.name ?? DEFAULT_PROCESS_DATA.groupName,
  entryMetaSourceIp: leader?.entry_meta?.source?.ip ?? DEFAULT_PROCESS_DATA.entryMetaSourceIp,
});

export const getDetailPanelProcess = (process: Process | undefined) => {
  const processData = {
    id: DEFAULT_PROCESS_DATA.id,
    start: DEFAULT_PROCESS_DATA.start,
    end: DEFAULT_PROCESS_DATA.end,
    exit_code: DEFAULT_PROCESS_DATA.exit_code,
    userName: DEFAULT_PROCESS_DATA.userName,
    groupName: DEFAULT_PROCESS_DATA.groupName,
    args: DEFAULT_PROCESS_DATA.args,
    executable: [],
    working_directory: DEFAULT_PROCESS_DATA.working_directory,
    pid: DEFAULT_PROCESS_DATA.pid,
    entryLeader: DEFAULT_PROCESS_DATA,
    sessionLeader: DEFAULT_PROCESS_DATA,
    groupLeader: DEFAULT_PROCESS_DATA,
    parent: DEFAULT_PROCESS_DATA,
  } as DetailPanelProcess;
  if (!process) {
    return processData;
  }
  const endProcessList = process.events.filter((items) => items.event.action === 'end');

  processData.id = process.id;
  processData.start = process.events[0]?.['@timestamp'] ?? '';
  processData.end =
    endProcessList.length === 0
      ? ''
      : (endProcessList[endProcessList.length - 1]['@timestamp'] as string);
  processData.args = [];
  processData.executable = [];

  process.events.forEach((event) => {
    if (!processData.userName) {
      processData.userName = event.user?.name ?? '';
    }
    if (!processData.groupName) {
      processData.groupName = event.group?.name ?? '';
    }
    if (!processData.pid) {
      processData.pid = event.process?.pid ?? -1;
    }
    if (!processData.working_directory) {
      processData.working_directory = event.process?.working_directory ?? '';
    }
    if (!processData.tty) {
      processData.tty = event.process?.tty;
    }

    if (event.process?.args && event.process.args.length > 0) {
      processData.args = event.process.args;
    }
    if (
      event.process?.executable &&
      event.event?.action &&
      FILTER_FORKS_EXECS.includes(event.event.action)
    ) {
      processData.executable.push([event.process.executable, `(${event.event.action})`]);
    }
    if (event.process?.exit_code !== undefined) {
      processData.exit_code = event.process.exit_code;
    }
  });

  processData.entryLeader = getDetailPanelProcessLeader(process.events[0]?.process?.entry_leader);
  processData.sessionLeader = getDetailPanelProcessLeader(
    process.events[0]?.process?.session_leader
  );
  processData.groupLeader = getDetailPanelProcessLeader(process.events[0]?.process?.group_leader);
  processData.parent = getDetailPanelProcessLeader(process.events[0]?.process?.parent);

  return processData;
};

export const getSelectedTabContent = (tabs: EuiTabProps[], selectedTabId: string) => {
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId);

  if (selectedTab) {
    return selectedTab.content;
  }

  return null;
};
