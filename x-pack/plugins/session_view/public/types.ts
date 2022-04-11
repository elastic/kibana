/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ReactNode } from 'react';
import { CoreStart } from '../../../../src/core/public';
import { Teletype } from '../common/types/process_tree';

export type SessionViewServices = CoreStart;

export interface SessionViewDeps {
  // the root node of the process tree to render. e.g process.entry.entity_id or process.session_leader.entity_id
  sessionEntityId: string;
  height?: number;
  isFullScreen?: boolean;
  // if provided, the session view will jump to and select the provided event if it belongs to the session leader
  // session view will fetch a page worth of events starting from jumpToEvent as well as a page backwards.
  jumpToEntityId?: string;
  jumpToCursor?: string;

  // when loading session viewer from an alert, this prop can be set to add extra UX to keep the focus on the alert
  investigatedAlertId?: string;
  // Callback to open the alerts flyout
  loadAlertDetails?: (
    alertUuid: string,
    // Callback used when alert flyout panel is closed
    handleOnAlertDetailsClosed: () => void
  ) => void;
}

export interface EuiTabProps {
  id: string;
  name: string;
  content: ReactNode;
  disabled?: boolean;
  append?: ReactNode;
  prepend?: ReactNode;
}

export interface DetailPanelProcess {
  id: string;
  start: string;
  end: string;
  exit_code?: number;
  userName: string;
  groupName: string;
  args: string[];
  executable: string[][];
  working_directory: string;
  tty?: Teletype;
  pid?: number;
  entryLeader: DetailPanelProcessLeader;
  sessionLeader: DetailPanelProcessLeader;
  groupLeader: DetailPanelProcessLeader;
  parent: DetailPanelProcessLeader;
}

export interface DetailPanelProcessLeader {
  id: string;
  name: string;
  start: string;
  end?: string;
  exit_code?: number;
  userName: string;
  groupName: string;
  working_directory: string;
  tty?: Teletype;
  args: string[];
  pid?: number;
  entryMetaType: string;
  entryMetaSourceIp: string;
  executable: string;
}

export interface SessionViewStart {
  getSessionView: (props: SessionViewDeps) => JSX.Element;
}
