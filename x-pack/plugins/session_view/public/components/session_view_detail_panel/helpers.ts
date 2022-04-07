/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EventAction, Process, ProcessFields } from '../../../common/types/process_tree';
import { DetailPanelProcess, EuiTabProps } from '../../types';
import { ProcessImpl } from '../process_tree/hooks';

const FILTER_FORKS_EXECS = [EventAction.fork, EventAction.exec];

const DEFAULT_PROCESS_DATA = {
  id: '',
  name: '',
  start: '',
  end: '',
  userName: '',
  groupName: '',
  working_directory: '',
  args: [],
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
  executable: leader?.executable ?? DEFAULT_PROCESS_DATA.executable,
  id: leader?.entity_id ?? DEFAULT_PROCESS_DATA.id,
  entryMetaType: leader?.entry_meta?.type ?? DEFAULT_PROCESS_DATA.entryMetaType,
  userName: leader?.user?.name ?? DEFAULT_PROCESS_DATA.userName,
  groupName: leader?.group?.name ?? DEFAULT_PROCESS_DATA.groupName,
  entryMetaSourceIp: leader?.entry_meta?.source?.ip ?? DEFAULT_PROCESS_DATA.entryMetaSourceIp,
});

export const getDetailPanelProcess = (process: Process | undefined) => {
  const processData = {} as DetailPanelProcess;
  if (!process) {
    return {
      id: DEFAULT_PROCESS_DATA.id,
      start: DEFAULT_PROCESS_DATA.start,
      end: DEFAULT_PROCESS_DATA.end,
      userName: DEFAULT_PROCESS_DATA.userName,
      groupName: DEFAULT_PROCESS_DATA.groupName,
      args: DEFAULT_PROCESS_DATA.args,
      executable: [],
      working_directory: DEFAULT_PROCESS_DATA.working_directory,
      entryLeader: DEFAULT_PROCESS_DATA,
      sessionLeader: DEFAULT_PROCESS_DATA,
      groupLeader: DEFAULT_PROCESS_DATA,
      parent: DEFAULT_PROCESS_DATA,
    };
  }

  const endProcesses = new ProcessImpl(process.id);

  processData.id = process.id;
  processData.start = process.events[0]?.['@timestamp'] ?? '';
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
      processData.pid = event.process?.pid;
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
    endProcesses.addEvent(event);
  });

  processData.end = endProcesses.getEndTime() as string;
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
