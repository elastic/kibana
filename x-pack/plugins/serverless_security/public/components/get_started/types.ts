/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconProps } from '@elastic/eui';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type GetStartedComponentProps = {};

export type GetStartedComponent = (props?: GetStartedComponentProps) => JSX.Element;

export interface Section {
  id: string;
  title: string;
  titleSize?: 's' | 'xs' | 'xxs';
  titleElement?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';
  sections?: Section[];
  icon?: EuiIconProps;
  description?: string;
  activeConditions?: TogglePanelId[];
}

export enum TogglePanelId {
  Analytics = 'analytics',
  Cloud = 'cloud',
  Endpoint = 'endpoint',
}

export interface TogglePanelReducer {
  activeSections: Set<TogglePanelId>;
}

export interface TogglePanelAction {
  type: 'toggleSection';
  payload: { section: TogglePanelId };
}

export interface Switch {
  id: TogglePanelId;
  label: string;
}
