/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { ReactElement } from 'react';

import { LensPublicStart } from '../../lens/public';
import { SecurityPluginSetup } from '../../security/public';
import type {
  TriggersAndActionsUIPublicPluginSetup as TriggersActionsSetup,
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
} from '../../triggers_actions_ui/public';
import type { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import type { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import type { SpacesPluginStart } from '../../spaces/public';
import type { Storage } from '../../../../src/plugins/kibana_utils/public';

import {
  GetCasesProps,
  GetAllCasesSelectorModalProps,
  GetCreateCaseFlyoutProps,
  GetRecentCasesProps,
} from './methods';

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
  spaces?: SpacesPluginStart;
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

export interface CasesUiStart {
  /**
   * Get cases
   * @param props GetCasesProps
   * @return {ReactElement<GetCasesProps>}
   */
  getCases: (props: GetCasesProps) => ReactElement<GetCasesProps>;
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
  getCreateCaseFlyout: (props: GetCreateCaseFlyoutProps) => ReactElement<GetCreateCaseFlyoutProps>;
  /**
   * Get the recent cases component
   * @param props GetRecentCasesProps
   * @returns A react component for showing recent cases
   */
  getRecentCases: (props: GetRecentCasesProps) => ReactElement<GetRecentCasesProps>;
}
