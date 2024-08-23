/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconProps } from '@elastic/eui';
import type React from 'react';
import type { HttpSetup } from '@kbn/core/public';
import type { ProductLine } from './configs';
import type { StepLinkId } from './step_links/types';
import type {
  OnboardingHubStepOpenTrigger,
  OnboardingHubStepFinishedTrigger,
} from '../../../lib/telemetry/types';

export interface Section {
  cards: Card[];
  icon?: EuiIconProps;
  id: SectionId;
  title: string;
}

export interface Badge {
  name: string;
  id: string;
}

export type StepId =
  | CreateProjectSteps
  | OverviewSteps
  | AddIntegrationsSteps
  | ViewDashboardSteps
  | EnablePrebuiltRulesSteps
  | ViewAlertsSteps;

type AutoCheckAddIntegrationsSteps = ({
  indicesExist,
}: {
  indicesExist: boolean;
}) => Promise<boolean>;
type AutoCheckEnablePrebuiltRulesSteps = ({
  abortSignal,
  kibanaServicesHttp,
  onError,
}: {
  abortSignal: AbortController;
  kibanaServicesHttp: HttpSetup;
  onError?: (error: Error) => void;
}) => Promise<boolean>;

export type CheckIfStepCompleted<T = StepId> =
  T extends EnablePrebuiltRulesSteps.enablePrebuiltRules
    ? AutoCheckEnablePrebuiltRulesSteps
    : T extends AddIntegrationsSteps.connectToDataSources
    ? AutoCheckAddIntegrationsSteps
    : undefined;

export interface Step<T = StepId> {
  autoCheckIfStepCompleted?: CheckIfStepCompleted<T>;
  description?: Array<React.ReactNode | string>;
  id: StepId;
  productLineRequired?: ProductLine[];
  splitPanel?: React.ReactNode;
  title?: string;
  icon?: EuiIconProps;
  timeInMinutes?: number;
}

export type CardId =
  | QuickStartSectionCardsId
  | AddAndValidateYourDataCardsId
  | GetStartedWithAlertsCardsId;

export interface Card {
  id: CardId;
  steps?: Step[];
  hideSteps?: boolean;
}

export type ActiveSections = Partial<Record<SectionId, Partial<Record<CardId, ActiveCard>>>>;

export enum SectionId {
  quickStart = 'quick_start',
  addAndValidateYourData = 'add_and_validate_your_data',
  getStartedWithAlerts = 'get_started_with_alerts',
}

export enum QuickStartSectionCardsId {
  createFirstProject = 'create_first_project',
  watchTheOverviewVideo = 'watch_the_overview_video',
}

export enum AddAndValidateYourDataCardsId {
  addIntegrations = 'add_integrations',
  viewDashboards = 'view_dashboards',
}

export enum GetStartedWithAlertsCardsId {
  enablePrebuiltRules = 'enable_prebuilt_rules',
  viewAlerts = 'view_alerts',
}

export enum BadgeId {
  analytics = 'analytics',
  cloud = 'cloud',
  edr = 'edr',
}

export enum CreateProjectSteps {
  createFirstProject = 'create_your_first_project',
}

export enum OverviewSteps {
  getToKnowElasticSecurity = 'watch_the_overview_video',
}

export enum AddIntegrationsSteps {
  connectToDataSources = 'add_integrations',
}

export enum ViewDashboardSteps {
  analyzeData = 'view_and_analyze_your_data',
}

export enum EnablePrebuiltRulesSteps {
  enablePrebuiltRules = 'enable_prebuilt_rules',
}

export enum ViewAlertsSteps {
  viewAlerts = 'view_alerts',
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
  onboardingSteps: StepId[];
}

export interface ToggleProductAction {
  type: OnboardingActions.ToggleProduct;
  payload: { section: ProductLine };
}

export interface AddFinishedStepAction {
  type: OnboardingActions.AddFinishedStep;
  payload: { stepId: StepId; cardId: CardId; sectionId: SectionId };
}

export interface RemoveFinishedStepAction {
  type: OnboardingActions.RemoveFinishedStep;
  payload: { stepId: StepId; cardId: CardId; sectionId: SectionId };
}

export interface ToggleStepAction {
  type: OnboardingActions.ToggleExpandedStep;
  payload: { stepId: StepId; cardId: CardId; isStepExpanded?: boolean };
}

export type ReducerActions =
  | ToggleProductAction
  | AddFinishedStepAction
  | RemoveFinishedStepAction
  | ToggleStepAction;

export interface Switch {
  id: ProductLine;
  label: string;
}

export enum OnboardingActions {
  AddFinishedStep = 'addFinishedStep',
  RemoveFinishedStep = 'removeFinishedStep',
  ToggleProduct = 'toggleProduct',
  ToggleExpandedStep = 'toggleExpandedStep',
}

export type OnStepClicked = ({
  stepId,
  cardId,
  sectionId,
  isExpanded,
  trigger,
}: {
  stepId: StepId;
  cardId: CardId;
  sectionId: SectionId;
  isExpanded: boolean;
  trigger: OnboardingHubStepOpenTrigger;
}) => void;

export type HandleStepClicked = ({
  stepId,
  isExpandedStep,
}: {
  stepId: StepId;
  isExpandedStep: boolean;
}) => void;

export type ToggleTaskCompleteStatus = ({
  stepId,
  stepLinkId,
  cardId,
  sectionId,
  undo,
  trigger,
}: {
  stepId: StepId;
  stepLinkId?: StepLinkId;
  cardId: CardId;
  sectionId: SectionId;
  undo?: boolean;
  trigger: OnboardingHubStepFinishedTrigger;
}) => void;
