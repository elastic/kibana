/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { ReactElement } from 'react';
import {
  TriggersAndActionsUIPublicPluginSetup as TriggersActionsSetup,
  TriggersAndActionsUIPublicPluginStart as TriggersActionsStart,
} from '../../triggers_actions_ui/public';
import { CreateCaseProps } from './components/create';

export interface SetupPlugins {
  triggersActionsUi: TriggersActionsSetup;
}

export interface StartPlugins {
  triggersActionsUi: TriggersActionsStart;
}

export type StartServices = CoreStart & StartPlugins;

export interface CasesUiStart {
  casesComponent: () => JSX.Element;
  getCreateCase: (props: CreateCaseProps) => ReactElement<CreateCaseProps>;
}
