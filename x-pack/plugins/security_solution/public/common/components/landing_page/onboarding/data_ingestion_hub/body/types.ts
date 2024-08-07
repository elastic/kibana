/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconProps } from '@elastic/eui';
import type { HttpSetup } from '@kbn/core/public';

export interface Section {
  cards: Card[];
  icon?: EuiIconProps;
  id: SectionId;
  title: string;
}

export interface Card {
  id: CardId;
  hideSteps?: boolean;
  autoCheckIfStepCompleted?: CheckIfStepCompleted<T>;
  description?: Array<React.ReactNode | string>;
  splitPanel?: React.ReactNode;
  title?: string;
  icon?: EuiIconProps;
  timeInMinutes?: number;
  isExpanded?: boolean;
}

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

export type CheckIfStepCompleted<T = CardId> = T extends CardId.enablePrebuiltRules
  ? AutoCheckEnablePrebuiltRulesSteps
  : T extends CardId.addIntegrations
  ? AutoCheckAddIntegrationsSteps
  : undefined;

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
