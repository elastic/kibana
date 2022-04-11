/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EventAction, Process, ProcessFields } from '../../../common/types/process_tree';
import { DetailPanelProcess, EuiTabProps } from '../../types';

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

  const details = process.getDetails();

  processData.id = process.id;
  processData.start = details.process?.start ?? '';
  processData.args = [];
  processData.executable = [];

  if (!processData.userName) {
    processData.userName = details.process?.user?.name ?? '';
  }
  if (!processData.groupName) {
    processData.groupName = details.process?.group?.name ?? '';
  }
  if (!processData.pid) {
    processData.pid = details.process?.pid;
  }
  if (!processData.working_directory) {
    processData.working_directory = details.process?.working_directory ?? '';
  }
  if (!processData.tty) {
    processData.tty = details.process?.tty;
  }
  if (details.process?.args && details.process.args.length > 0) {
    processData.args = details.process.args;
  }
  if (details.process?.exit_code !== undefined) {
    processData.exit_code = details.process.exit_code;
  }

  // we grab the executable from each process lifecycle event to give an indication
  // of the processes journey. Processes can sometimes exec multiple times, so it's good
  // information to have.
  process.events.forEach((event) => {
    if (
      event.process?.executable &&
      event.event?.action &&
      FILTER_FORKS_EXECS.includes(event.event.action)
    ) {
      processData.executable.push([event.process.executable, `(${event.event.action})`]);
    }
  });

  processData.end = process.getEndTime();
  processData.entryLeader = getDetailPanelProcessLeader(details?.process?.entry_leader);
  processData.sessionLeader = getDetailPanelProcessLeader(details?.process?.session_leader);
  processData.groupLeader = getDetailPanelProcessLeader(details?.process?.group_leader);
  processData.parent = getDetailPanelProcessLeader(details?.process?.parent);

  return processData;
};

export const getSelectedTabContent = (tabs: EuiTabProps[], selectedTabId: string) => {
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId);

  if (selectedTab) {
    return selectedTab.content;
  }

  return null;
};
