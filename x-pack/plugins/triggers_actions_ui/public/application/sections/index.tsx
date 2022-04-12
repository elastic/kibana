/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { suspendedComponentWithProps } from '../lib/suspended_component_with_props';

export type {
  ActionGroupWithCondition,
  RuleConditionsProps as AlertConditionsProps,
} from './rule_form/rule_conditions';

export const AlertConditions = lazy(() => import('./rule_form/rule_conditions'));
export const AlertConditionsGroup = lazy(() => import('./rule_form/rule_conditions_group'));

export const AlertAdd = suspendedComponentWithProps(lazy(() => import('./rule_form/rule_add')));
export const AlertEdit = suspendedComponentWithProps(lazy(() => import('./rule_form/rule_edit')));

export const ConnectorAddFlyout = suspendedComponentWithProps(
  lazy(() => import('./action_connector_form/connector_add_flyout'))
);
export const ConnectorEditFlyout = suspendedComponentWithProps(
  lazy(() => import('./action_connector_form/connector_edit_flyout'))
);
export const ActionForm = suspendedComponentWithProps(
  lazy(() => import('./action_connector_form/action_form'))
);
