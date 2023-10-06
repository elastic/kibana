/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconProps } from '@elastic/eui';
import type React from 'react';

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

export type StepId = IntroductionSteps | ConfigureSteps | ExploreSteps;

export interface Step {
  description?: Array<React.ReactNode | string>;
  id: StepId;
  productLineRequired?: ProductLine[];
  splitPanel?: React.ReactNode;
  title: string;
  timeInMinutes?: number;
}

export type CardId = GetSetUpCardId;

export interface Card {
  icon?: EuiIconProps;
  id: CardId;
  steps?: Step[];
  title: string;
}

export type ActiveSections = Partial<Record<SectionId, Partial<Record<CardId, ActiveCard>>>>;

export enum SectionId {
  getSetUp = 'getSetUp',
  getMoreFromElasticSecurity = 'getMoreFromElasticSecurity',
}

export enum GetSetUpCardId {
  configure = 'configure',
  introduction = 'introduction',
  explore = 'explore',
}

export enum BadgeId {
  analytics = 'analytics',
  cloud = 'cloud',
  edr = 'edr',
}

export enum IntroductionSteps {
  getToKnowElasticSecurity = 'getToKnowElasticSecurity',
}

export enum ConfigureSteps {
  learnAbout = 'learnAbout',
  deployElasticAgent = 'deployElasticAgent',
  connectToDataSources = 'connectToDataSources',
  enablePrebuiltRules = 'enablePrebuiltRules',
}

export enum ExploreSteps {
  viewAlerts = 'viewAlerts',
  analyzeData = 'analyzeData',
}

export interface ActiveCard {
  id: CardId;
  timeInMins: number;
  stepsLeft: number;
  activeStepIds: StepId[] | undefined;
}
export interface ExpandedCardStep {
  isExpanded: boolean;
  expandedSteps: StepId[];
}
export type ExpandedCardSteps = Record<CardId, ExpandedCardStep>;
export interface TogglePanelReducer {
  activeProducts: Set<ProductLine>;
  activeSections: ActiveSections | null;
  expandedCardSteps: ExpandedCardSteps;
  finishedSteps: Record<CardId, Set<StepId>>;
  totalActiveSteps: number | null;
  totalStepsLeft: number | null;
}

export interface ToggleProductAction {
  type: GetStartedPageActions.ToggleProduct;
  payload: { section: ProductLine };
}

export interface AddFinishedStepAction {
  type: GetStartedPageActions.AddFinishedStep;
  payload: { stepId: StepId; cardId: CardId; sectionId: SectionId };
}

export interface RemoveFinishedStepAction {
  type: GetStartedPageActions.RemoveFinishedStep;
  payload: { stepId: StepId; cardId: CardId; sectionId: SectionId };
}

export interface ToggleCardStepAction {
  type: GetStartedPageActions.ToggleExpandedCardStep;
  payload: { stepId?: StepId; cardId: CardId; isCardExpanded?: boolean; isStepExpanded?: boolean };
}

export type ReducerActions =
  | ToggleProductAction
  | AddFinishedStepAction
  | RemoveFinishedStepAction
  | ToggleCardStepAction;

export interface Switch {
  id: ProductLine;
  label: string;
}

export enum GetStartedPageActions {
  AddFinishedStep = 'addFinishedStep',
  RemoveFinishedStep = 'removeFinishedStep',
  ToggleProduct = 'toggleProduct',
  ToggleExpandedCardStep = 'toggleExpandedCardStep',
}

export type OnStepClicked = ({
  stepId,
  cardId,
  sectionId,
  isExpanded,
}: {
  stepId: StepId;
  cardId: CardId;
  sectionId: SectionId;
  isExpanded: boolean;
}) => void;

export type OnCardClicked = ({
  cardId,
  isExpanded,
}: {
  cardId: CardId;
  isExpanded: boolean;
}) => void;

export type OnStepButtonClicked = ({
  stepId,
  cardId,
  sectionId,
  undo,
}: {
  stepId: StepId;
  cardId: CardId;
  sectionId: SectionId;
  undo?: boolean;
}) => void;
