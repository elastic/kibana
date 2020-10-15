/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import './frame_layout.scss';

import React from 'react';
import { EuiPage, EuiPageSideBar, EuiPageBody } from '@elastic/eui';

export interface FrameLayoutProps {
  dataPanel: React.ReactNode;
  configPanel?: React.ReactNode;
  suggestionsPanel?: React.ReactNode;
  workspacePanel?: React.ReactNode;
}

export function FrameLayout(props: FrameLayoutProps) {
  return (
    <EuiPage className="lnsFrameLayout">
      <div className="lnsFrameLayout__pageContent">
        <EuiPageSideBar className="lnsFrameLayout__sidebar">{props.dataPanel}</EuiPageSideBar>
        <EuiPageBody className="lnsFrameLayout__pageBody" restrictWidth={false}>
          {props.workspacePanel}
          {props.suggestionsPanel}
        </EuiPageBody>
        <EuiPageSideBar className="lnsFrameLayout__sidebar lnsFrameLayout__sidebar--right">
          {props.configPanel}
        </EuiPageSideBar>
      </div>
    </EuiPage>
  );
}
