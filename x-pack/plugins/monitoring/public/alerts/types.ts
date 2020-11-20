/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { CommonAlertStatus } from '../../common/types/alerts';

export interface AlertsByName {
  [name: string]: CommonAlertStatus;
}

export interface PanelItem {
  id: number;
  title: string;
  width?: number;
  content?: React.ReactElement;
  items?: Array<ContextMenuItem | ContextMenuItemSeparator>;
}

export interface ContextMenuItem {
  name: React.ReactElement;
  panel?: number;
  onClick?: () => void;
}

export interface ContextMenuItemSeparator {
  isSeparator: true;
}
