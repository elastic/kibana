/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Process, ProcessFields } from '../../../common/types/process_tree';
import { DetailPanelProcess } from '../../types';

const geteDetailPanelProcessLeader = (leader: ProcessFields) => ({
  ...leader,
  id: leader.entity_id,
  entryMetaType: leader.entry_meta?.type || '',
  userName: leader.user.name,
  entryMetaSourceIp: leader.entry_meta?.source.ip || '',
});

export const getDetailPanelProcess = (process: Process | null) => {
  const processData = {} as DetailPanelProcess;
  if (!process) {
    return processData;
  }

  processData.id = process.id;
  processData.start = process.events[0]?.['@timestamp'] || '';
  processData.end = process.events[process.events.length - 1]?.['@timestamp'] || '';
  const args = new Set<string>();
  processData.executable = [];

  process.events.forEach((event) => {
    if (!processData.user) {
      processData.user = event.process.user.name;
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
  });

  processData.args = [...args];
  processData.entryLeader = geteDetailPanelProcessLeader(process.events[0].process.entry);
  processData.sessionLeader = geteDetailPanelProcessLeader(process.events[0].process.session);
  // processData.groupLeader = geteDetailPanelProcessLeader(process.events[0].process.group_leader);
  processData.parent = geteDetailPanelProcessLeader(process.events[0].process.parent);

  return processData;
};
