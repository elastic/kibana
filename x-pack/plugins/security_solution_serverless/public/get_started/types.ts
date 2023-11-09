/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconProps } from '@elastic/eui';

import type { ProductLine } from '../../common/product';

export interface Section {
  cards?: Card[];
  icon?: EuiIconProps;
  id: SectionId;
  title: string;
}

export interface Badge {
  name: string;
  id: string;
}

export type CardId = QuickStart | AddAndValidateData | GetStartedWithAlerts;

export interface Card {
  icon?: EuiIconProps;
  id: CardId;
  title: string;
  description?: string;
  startButton?: React.ReactNode;
}

export enum SectionId {
  quicStart = 'quicStart',
  addAndValidateData = 'addAndValidateData',
  getStartedWithAlerts = 'getStartedWithAlerts',
}

export enum BadgeId {
  analytics = 'analytics',
  cloud = 'cloud',
  edr = 'edr',
}

export enum QuickStart {
  createFirstProject = 'createFirstProject',
  watchTheOverviewVideo = 'watchTheOverviewVideo',
}

export enum AddAndValidateData {
  addIntegration = 'addIntegration',
  viewAndAnalyzeDataWithDashboards = 'viewAndAnalyzeDataWithDashboards',
}

export enum GetStartedWithAlerts {
  enablePrebuiltRules = 'enablePrebuiltRules',
  viewAlerts = 'viewAlerts',
}

export interface TogglePanelReducer {
  finishedCards: Set<CardId>;
  totalCardsLeft: number | null;
}

export interface AddFinishedCardAction {
  type: GetStartedPageActions.AddFinishedCard;
  payload: { cardId: CardId };
}

export interface RemoveFinishedCardAction {
  type: GetStartedPageActions.RemoveFinishedCard;
  payload: { cardId: CardId };
}

export type ReducerActions = AddFinishedCardAction | RemoveFinishedCardAction;

export interface Switch {
  id: ProductLine;
  label: string;
}

export enum GetStartedPageActions {
  AddFinishedCard = 'addFinishedCard',
  RemoveFinishedCard = 'removeFinishedCard',
}

export type ToggleFinishedCard = ({ cardId, undo }: { cardId: CardId; undo?: boolean }) => void;

export interface ModalContextValue {
  openModal: () => void;
  closeModal: () => void;
  toggleFinishedCard: ToggleFinishedCard;
}
