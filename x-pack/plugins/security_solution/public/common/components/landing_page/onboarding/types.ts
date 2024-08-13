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

export type CheckIfStepCompleted<T = CardId> = T extends CardId.enablePrebuiltRules
  ? AutoCheckEnablePrebuiltRulesSteps
  : T extends CardId.addIntegrations
  ? AutoCheckAddIntegrationsSteps
  : undefined;

export interface Card<T = CardId> {
  id: CardId;
  hideSteps?: boolean;
  autoCheckIfCardCompleted?: CheckIfStepCompleted<T>;
  description?: Array<React.ReactNode | string>;
  splitPanel?: React.ReactNode;
  title?: string;
  icon?: EuiIconProps;
}

export type ExpandedCards = Set<CardId>;

export type ActiveSections = Partial<Record<SectionId, CardId[]>>;

export enum SectionId {
  quickStart = 'quick_start',
  addAndValidateYourData = 'add_and_validate_your_data',
  getStartedWithAlerts = 'get_started_with_alerts',
}

export enum CardId {
  createFirstProject = 'create_first_project',
  watchTheOverviewVideo = 'watch_the_overview_video',
  addIntegrations = 'add_integrations',
  viewDashboards = 'view_dashboards',
  enablePrebuiltRules = 'enable_prebuilt_rules',
  viewAlerts = 'view_alerts',
}

export interface TogglePanelReducer {
  activeSections: ActiveSections | null;
  expandedCardIds: Set<CardId>;
  finishedCardIds: Set<CardId>;
  onboardingSteps: CardId[];
}

export interface AddFinishedCardAction {
  type: OnboardingActions.AddFinishedCard;
  payload: { cardId: CardId };
}

export interface RemoveFinishedCardAction {
  type: OnboardingActions.RemoveFinishedCard;
  payload: { cardId: CardId };
}

export interface ToggleCardAction {
  type: OnboardingActions.ToggleExpandedCard;
  payload: { cardId: CardId; isCardExpanded?: boolean };
}

export type ReducerActions = AddFinishedCardAction | RemoveFinishedCardAction | ToggleCardAction;

export interface Switch {
  id: ProductLine;
  label: string;
}

export enum OnboardingActions {
  AddFinishedCard = 'addFinishedStep',
  RemoveFinishedCard = 'removeFinishedStep',
  ToggleExpandedCard = 'toggleExpandedStep',
}

export type OnCardClicked = ({
  cardId,
  sectionId,
  isExpanded,
  trigger,
}: {
  cardId: CardId;
  sectionId: SectionId;
  isExpanded: boolean;
  trigger: OnboardingHubStepOpenTrigger;
}) => void;

export type HandleCardClicked = ({
  cardId,
  isExpandedStep,
}: {
  cardId: CardId;
  isExpandedStep: boolean;
}) => void;

export type ToggleTaskCompleteStatus = ({
  stepLinkId,
  cardId,
  sectionId,
  undo,
  trigger,
}: {
  stepLinkId?: StepLinkId;
  cardId: CardId;
  sectionId: SectionId;
  undo?: boolean;
  trigger: OnboardingHubStepFinishedTrigger;
}) => void;
