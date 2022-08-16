/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ReactNode } from 'react';
import { CoreStart } from '@kbn/core/public';

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
  exitCode: string;
  userName: string;
  groupName: string;
  args: string;
  executable: string[][];
  workingDirectory: string;
  interactive: string;
  pid: string;
  entryLeader: DetailPanelProcessLeader;
  sessionLeader: DetailPanelProcessLeader;
  groupLeader: DetailPanelProcessLeader;
  parent: DetailPanelProcessLeader;
}

export interface DetailPanelProcessLeader {
  id: string;
  name: string;
  start: string;
  end: string;
  exitCode: string;
  userName: string;
  groupName: string;
  workingDirectory: string;
  interactive: string;
  args: string;
  pid: string;
  entryMetaType: string;
  entryMetaSourceIp: string;
  executable: string[][];
}

export interface DetailPanelHost {
  architecture: string;
  hostname: string;
  id: string;
  ip: string;
  mac: string;
  name: string;
  os: {
    family: string;
    full: string;
    kernel: string;
    name: string;
    platform: string;
    version: string;
  };
}

export interface DetailPanelContainer {
  id: string;
  name: string;
  image: {
    name: string;
    tag: string;
    hash: {
      all: string;
    };
  };
}

export interface DetailPanelOrchestrator {
  resource: {
    name: string;
    type: string;
    ip: string;
    parent: {
      type: string;
    };
  };
  namespace: string;
  cluster: {
    name: string;
    id: string;
  };
}

export interface DetailPanelCloud {
  instance: {
    name: string;
  };
  account: {
    id: string;
  };
  project: {
    id: string;
  };
  provider: string;
  region: string;
}

export interface SessionViewStart {
  getSessionView: (props: SessionViewDeps) => JSX.Element;
}
