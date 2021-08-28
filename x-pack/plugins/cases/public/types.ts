/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactElement } from 'react';
import type { CoreStart } from '../../../../src/core/public/types';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public/types';
import type { EmbeddableStart } from '../../../../src/plugins/embeddable/public/plugin';
import { Storage } from '../../../../src/plugins/kibana_utils/public/storage/storage';
import type { LensPublicStart } from '../../lens/public/plugin';
import type { SecurityPluginSetup } from '../../security/public/plugin';
import type {
  TriggersAndActionsUIPublicPluginSetup as TriggersActionsSetup,
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
} from '../../triggers_actions_ui/public/plugin';
import type { AllCasesProps } from './components/all_cases';
import type { AllCasesSelectorModalProps } from './components/all_cases/selector_modal';
import type { CaseViewProps } from './components/case_view';
import type { ConfigureCasesProps } from './components/configure_cases';
import type { CreateCaseProps } from './components/create';
import type { RecentCasesProps } from './components/recent_cases';

export interface SetupPlugins {
  security: SecurityPluginSetup;
  triggersActionsUi: TriggersActionsSetup;
}

export interface StartPlugins {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  lens: LensPublicStart;
  storage: Storage;
  triggersActionsUi: TriggersActionsStart;
}

/**
 * TODO: The extra security service is one that should be implemented in the kibana context of the consuming application.
 * Security is needed for access to authc for the `useCurrentUser` hook. Security_Solution currently passes it via renderApp in public/plugin.tsx
 * Leaving it out currently in lieu of RBAC changes
 */

export type StartServices = CoreStart &
  StartPlugins & {
    security: SecurityPluginSetup;
  };

export interface Owner {
  owner: string[];
}

export interface CasesUiStart {
  /**
   * Get the all cases table
   * @param props AllCasesProps
   * @returns A react component that displays all cases
   */
  getAllCases: (props: AllCasesProps) => ReactElement<AllCasesProps>;
  /**
   * use Modal hook for all cases selector
   * @param props UseAllCasesSelectorModalProps
   * @returns A react component that is a modal for selecting a case
   */
  getAllCasesSelectorModal: (
    props: AllCasesSelectorModalProps
  ) => ReactElement<AllCasesSelectorModalProps>;
  /**
   * Get the case view component
   * @param props CaseViewProps
   * @returns A react component for viewing a specific case
   */
  getCaseView: (props: CaseViewProps) => ReactElement<CaseViewProps>;
  /**
   * Get the configure case component
   * @param props ConfigureCasesProps
   * @returns A react component for configuring a specific case
   */
  getConfigureCases: (props: ConfigureCasesProps) => ReactElement<ConfigureCasesProps>;
  /**
   * Get the create case form
   * @param props CreateCaseProps
   * @returns A react component for creating a new case
   */
  getCreateCase: (props: CreateCaseProps) => ReactElement<CreateCaseProps>;
  /**
   * Get the recent cases component
   * @param props RecentCasesProps
   * @returns A react component for showing recent cases
   */
  getRecentCases: (props: RecentCasesProps) => ReactElement<RecentCasesProps>;
}
