/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIconProps } from '@elastic/eui';
import React from 'react';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type GetStartedComponentProps = {};

export type GetStartedComponent = (props?: GetStartedComponentProps) => JSX.Element;

export interface Section {
  cards?: Card[];
  id: string;
  title: string;
  icon?: EuiIconProps;
  description?: string;
}

export interface Badge {
  name: string;
  id: string;
}

export interface Step {
  badges: Badge[];
  description?: string[];
  id: string;
  splitPanel?: React.ReactNode;
  title: string;
  timeInMinutes?: number;
}

export interface Card {
  activeConditions?: TogglePanelId[];
  description?: string | React.ReactNode;
  icon?: EuiIconProps;
  id: string;
  steps?: Step[];
  title: string;
}

export enum TogglePanelId {
  Analytics = 'analytics',
  Cloud = 'cloud',
  Endpoint = 'endpoint',
}

export interface TogglePanelReducer {
  activeSections: Set<TogglePanelId>;
  finishedSteps: Record<string, Set<string>>;
}

export interface TogglePanelAction {
  type: 'toggleSection';
  payload: { section: TogglePanelId };
}

export interface ToggleStepAction {
  type: 'addFinishStep';
  payload: { cardId: string; stepId: string };
}

export interface Switch {
  id: TogglePanelId;
  label: string;
}
