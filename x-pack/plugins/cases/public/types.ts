/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { ReactElement } from 'react';
import { SecurityPluginStart } from '../../security/public';
import {
  TriggersAndActionsUIPublicPluginSetup as TriggersActionsSetup,
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
} from '../../triggers_actions_ui/public';
import { AllCasesProps } from './components/all_cases';
import { CreateCaseProps } from './components/create';

export interface SetupPlugins {
  triggersActionsUi: TriggersActionsSetup;
}

/**
 * TODO: we need SecurityPluginSetup for authC (for useCurrentUser), security_solution passes it via services
 * We also could use storage as a function or pass it as a service similar to how Security_Solution does for `useMessagesStorage`
 * Will we need to create KibanaContext to append the services for useKibana...
 */

export interface StartPlugins {
  security: SecurityPluginStart;
  triggersActionsUi: TriggersActionsStart;
}

export type StartServices = CoreStart & StartPlugins;

export interface CasesUiStart {
  getAllCases: (props: AllCasesProps) => ReactElement<AllCasesProps>;
  getCreateCase: (props: CreateCaseProps) => ReactElement<CreateCaseProps>;
}
