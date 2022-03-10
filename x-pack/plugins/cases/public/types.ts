/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { ReactElement, ReactNode } from 'react';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import type { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import type { Storage } from '../../../../src/plugins/kibana_utils/public';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import {
  ManagementSetup,
  ManagementAppMountParams,
} from '../../../../src/plugins/management/public';
import { FeaturesPluginStart } from '../..//features/public';
import type { LensPublicStart } from '../../lens/public';
import type { SecurityPluginSetup } from '../../security/public';
import type { SpacesPluginStart } from '../../spaces/public';
import type { TriggersAndActionsUIPublicPluginStart as TriggersActionsStart } from '../../triggers_actions_ui/public';
import {
  CasesByAlertId,
  CasesByAlertIDRequest,
  CommentRequestAlertType,
  CommentRequestUserType,
} from '../common/api';
import { UseCasesAddToExistingCaseModal } from './components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { UseCasesAddToNewCaseFlyout } from './components/create/flyout/use_cases_add_to_new_case_flyout';
import type { CasesOwners } from './client/helpers/can_use_cases';
import { getRuleIdFromEvent } from './client/helpers/get_rule_id_from_event';
import type { GetCasesContextProps } from './client/ui/get_cases_context';
import type { GetCasesProps } from './client/ui/get_cases';
import { GetAllCasesSelectorModalProps } from './client/ui/get_all_cases_selector_modal';
import { GetCreateCaseFlyoutProps } from './client/ui/get_create_case_flyout';
import { GetRecentCasesProps } from './client/ui/get_recent_cases';

export interface CasesPluginSetup {
  security: SecurityPluginSetup;
  management: ManagementSetup;
  home?: HomePublicPluginSetup;
}

export interface CasesPluginStart {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  lens: LensPublicStart;
  storage: Storage;
  triggersActionsUi: TriggersActionsStart;
  features: FeaturesPluginStart;
  spaces?: SpacesPluginStart;
}

/**
 * TODO: The extra security service is one that should be implemented in the kibana context of the consuming application.
 * Security is needed for access to authc for the `useCurrentUser` hook. Security_Solution currently passes it via renderApp in public/plugin.tsx
 * Leaving it out currently in lieu of RBAC changes
 */

export type StartServices = CoreStart &
  CasesPluginStart & {
    security: SecurityPluginSetup;
  };

export interface RenderAppProps {
  mountParams: ManagementAppMountParams;
  coreStart: CoreStart;
  pluginsStart: CasesPluginStart;
  storage: Storage;
  kibanaVersion: string;
}

export interface CasesUiStart {
  api: {
    getRelatedCases: (alertId: string, query: CasesByAlertIDRequest) => Promise<CasesByAlertId>;
  };
  ui: {
    /**
     * Get cases
     * @param props GetCasesProps
     * @return {ReactElement<GetCasesProps>}
     */
    getCases: (props: GetCasesProps) => ReactElement<GetCasesProps>;
    getCasesContext: () => (
      props: GetCasesContextProps & { children: ReactNode }
    ) => ReactElement<GetCasesContextProps>;
    /**
     * Modal to select a case in a list of all owner cases
     * @param props GetAllCasesSelectorModalProps
     * @returns A react component that is a modal for selecting a case
     */
    getAllCasesSelectorModal: (
      props: GetAllCasesSelectorModalProps
    ) => ReactElement<GetAllCasesSelectorModalProps>;
    /**
     * Flyout with the form to create a case for the owner
     * @param props GetCreateCaseFlyoutProps
     * @returns A react component that is a flyout for creating a case
     */
    getCreateCaseFlyout: (
      props: GetCreateCaseFlyoutProps
    ) => ReactElement<GetCreateCaseFlyoutProps>;
    /**
     * Get the recent cases component
     * @param props GetRecentCasesProps
     * @returns A react component for showing recent cases
     */
    getRecentCases: (props: GetRecentCasesProps) => ReactElement<GetRecentCasesProps>;
  };
  hooks: {
    getUseCasesAddToNewCaseFlyout: UseCasesAddToNewCaseFlyout;
    getUseCasesAddToExistingCaseModal: UseCasesAddToExistingCaseModal;
  };
  helpers: {
    /**
     * Returns an object denoting the current user's ability to read and crud cases.
     * If any owner(securitySolution, Observability) is found with crud or read capability respectively,
     * then crud or read is set to true.
     * Permissions for specific owners can be found by passing an owner array
     * @param owners an array of CaseOwners that should be queried for permission
     * @returns An object denoting the case permissions of the current user
     */
    canUseCases: (owners?: CasesOwners[]) => { crud: boolean; read: boolean };
    getRuleIdFromEvent: typeof getRuleIdFromEvent;
  };
}

export type SupportedCaseAttachment = CommentRequestAlertType | CommentRequestUserType;
export type CaseAttachments = SupportedCaseAttachment[];
