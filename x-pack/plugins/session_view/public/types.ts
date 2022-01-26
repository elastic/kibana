/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { CoreStart } from '../../../../src/core/public';
import { TimelinesUIStart } from '../../timelines/public';

export interface SessionViewConfigType {
  enabled: boolean;
}

export type SessionViewServices = CoreStart & {
  timelines: TimelinesUIStart;
};

export interface DetailPanelProcess {
  id: string;
  start: Date;
  end: Date;
  exit_code: string;
  user: string;
  args: string[];
  executable: string[][];
  pid: number;
  entryLeader: DetailPanelProcessLeader;
  sessionLeader: DetailPanelProcessLeader;
  groupLeader: DetailPanelProcessLeader;
  parent: DetailPanelProcessLeader;
}

export interface DetailPanelProcessLeader {
  id: string;
  start: Date;
  entryMetaType: string;
  userName: string;
  interactive: boolean;
  pid: number;
  entryMetaSourceIp: string;
  executable: string;
}
