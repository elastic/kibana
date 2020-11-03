/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { CommonAlertState, CommonAlertStatus } from '../../common/types/alerts';

export interface AlertStatusAndState {
  alert: CommonAlertStatus;
  alertState: CommonAlertState;
}

export interface PanelItem {
  id: number;
  title: string;
  width?: number;
  content?: React.ReactElement;
  items?: ContextMenuItem[];
}

export interface ContextMenuItem {
  name: React.ReactElement;
  panel: number;
  isSeparator?: boolean;
}
