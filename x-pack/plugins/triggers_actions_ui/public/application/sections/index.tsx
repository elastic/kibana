/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { lazy } from 'react';
import { suspendedComponentWithProps } from '../lib/suspended_component_with_props';

export const AlertAdd = suspendedComponentWithProps(lazy(() => import('./alert_form/alert_add')));
export const AlertEdit = suspendedComponentWithProps(lazy(() => import('./alert_form/alert_edit')));

export const ConnectorAddFlyout = suspendedComponentWithProps(
  lazy(() => import('./action_connector_form/connector_add_flyout'))
);
export const ConnectorEditFlyout = suspendedComponentWithProps(
  lazy(() => import('./action_connector_form/connector_edit_flyout'))
);
export const ActionForm = suspendedComponentWithProps(
  lazy(() => import('./action_connector_form/action_form'))
);
