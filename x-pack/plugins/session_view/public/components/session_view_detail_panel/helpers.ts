/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EventAction, Process, ProcessFields } from '../../../common/types/process_tree';
import { DetailPanelProcess, EuiTabProps } from '../../types';

const FILTER_FORKS_EXECS = [EventAction.fork, EventAction.exec];

const DEFAULT_LEADER_DATA = {
  id: '',
  name: '',
  start: '',
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
  // init values for fields that might not be available
  name: '',
  start: '',
  working_directory: '',
  args: [],
  pid: -1,
  executable: '',

  ...leader,
  id: leader?.entity_id ?? '',
  entryMetaType: leader?.entry_meta?.type ?? '',
  userName: leader?.user?.name ?? '',
  groupName: leader?.group?.name ?? '',
  entryMetaSourceIp: leader?.entry_meta?.source?.ip ?? '',
});

export const getDetailPanelProcess = (process: Process | undefined) => {
  const processData = {
    id: '',
    start: '',
    end: '',
    exit_code: -1,
    userName: '',
    groupName: '',
    args: [],
    executable: [],
    working_directory: '',
    pid: -1,
    entryLeader: DEFAULT_LEADER_DATA,
    sessionLeader: DEFAULT_LEADER_DATA,
    groupLeader: DEFAULT_LEADER_DATA,
    parent: DEFAULT_LEADER_DATA,
  } as DetailPanelProcess;
  if (!process) {
    return processData;
  }

  processData.id = process.id;
  processData.start = process.events[0]?.['@timestamp'] ?? '';
  processData.end = process.events[process.events.length - 1]?.['@timestamp'] ?? '';
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
