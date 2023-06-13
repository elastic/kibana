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

export interface HeaderSection {
  description?: string;
  icon: EuiIconProps;
  id: string;
  title: string;
}
export interface Section {
  cards?: Card[];
  description?: string;
  icon?: EuiIconProps;
  id: SectionId;
  title: string;
}

export interface Badge {
  name: string;
  id: string;
}

export type StepId = IntroductionSteps;

export interface Step {
  badges: Badge[];
  description?: string[];
  id: StepId;
  splitPanel?: React.ReactNode;
  title: string;
  timeInMinutes?: number;
}

export type CardId = GetSetUpCardId | GetMoreFromElasticSecurityCardId;

export interface Card {
  productTypeRequired?: ProductId[];
  description?: string | React.ReactNode;
  icon?: EuiIconProps;
  id: CardId;
  steps?: Step[];
  title: string;
  timeInMins?: number;
  stepsLeft?: number;
}

export enum ProductId {
  analytics = 'analytics',
  cloud = 'cloud',
  endpoint = 'endpoint',
}

export enum SectionId {
  getSetUp = 'getSetUp',
  getMoreFromElasticSecurity = 'getMoreFromElasticSecurity',
}

export enum GetSetUpCardId {
  activateAndCreateRules = 'activateAndCreateRules',
  bringInYourData = 'bringInYourData',
  introduction = 'introduction',
  protectYourEnvironmentInRuntime = 'protectYourEnvironmentInRuntime',
}

export enum IntroductionSteps {
  watchOverviewVideo = 'watchOverviewVideo',
}

export enum GetMoreFromElasticSecurityCardId {
  masterTheInvestigationsWorkflow = 'masterTheInvestigationsWorkflow',
  optimizeYourWorkSpace = 'optimizeYourWorkSpace',
  respondToThreats = 'respondToThreats',
}

export interface ActiveCard {
  id: CardId;
  timeInMins: number;
  stepsLeft: number;
}
export interface TogglePanelReducer {
  activeProducts: Set<ProductId>;
  finishedSteps: Record<CardId, Set<StepId>>;
  activeCards: Record<SectionId, Record<CardId, ActiveCard>> | null;
}

export interface ToggleProductAction {
  type: GetStartedPageActions.ToggleProduct;
  payload: { section: ProductId };
}

export interface AddFinishedStepAction {
  type: GetStartedPageActions.AddFinishedStep;
  payload: { stepId: StepId; cardId: CardId; sectionId: SectionId };
}

export interface Switch {
  id: ProductId;
  label: string;
}

export enum GetStartedPageActions {
  AddFinishedStep = 'addFinishedStep',
  ToggleProduct = 'toggleProduct',
}
