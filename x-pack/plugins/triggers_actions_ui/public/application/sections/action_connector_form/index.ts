/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lazy } from 'react';
import { suspendedComponentWithProps } from '../../lib/suspended_component_with_props';

export const ConnectorAddFlyout = suspendedComponentWithProps(
  lazy(() => import('./connector_add_flyout'))
);
export const ConnectorEditFlyout = suspendedComponentWithProps(
  lazy(() => import('./connector_edit_flyout'))
);
export const ActionForm = suspendedComponentWithProps(lazy(() => import('./action_form')));

export const ConnectorAddModal = suspendedComponentWithProps(
  lazy(() => import('./connector_add_modal'))
);

export const AddConnectorInline = suspendedComponentWithProps(
  lazy(() => import('./connector_add_inline'))
);
