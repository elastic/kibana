/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Process, ProcessFields } from '../../../common/types/process_tree';
import { DetailPanelProcess, EuiTabProps } from '../../types';

const getDetailPanelProcessLeader = (leader: ProcessFields) => ({
  ...leader,
  id: leader.entity_id,
  entryMetaType: leader.entry_meta?.type || '',
  userName: leader.user.name,
  entryMetaSourceIp: leader.entry_meta?.source.ip || '',
});

export const getDetailPanelProcess = (process: Process) => {
  const processData = {} as DetailPanelProcess;

  processData.id = process.id;
  processData.start = process.events[0]['@timestamp'];
  processData.end = process.events[process.events.length - 1]['@timestamp'];
  const args = new Set<string>();
  processData.executable = [];

  process.events.forEach((event) => {
    if (!processData.user) {
      processData.user = event.user.name;
    }
    if (!processData.pid) {
      processData.pid = event.process.pid;
    }

    if (event.process.args.length > 0) {
      args.add(event.process.args.join(' '));
    }
    if (event.process.executable) {
      processData.executable.push([event.process.executable, `(${event.event.action})`]);
    }
    if (event.process.exit_code) {
      processData.exit_code = event.process.exit_code;
    }
  });

  processData.args = [...args];
  processData.entryLeader = getDetailPanelProcessLeader(process.events[0].process.entry_leader);
  processData.sessionLeader = getDetailPanelProcessLeader(process.events[0].process.session_leader);
  processData.groupLeader = getDetailPanelProcessLeader(process.events[0].process.group_leader);
  processData.parent = getDetailPanelProcessLeader(process.events[0].process.parent);

  return processData;
};

export const getSelectedTabContent = (tabs: EuiTabProps[], selectedTabId: string) => {
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId);

  if (selectedTab) {
    return selectedTab.content;
  }

  return null;
};
