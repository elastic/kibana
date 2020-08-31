/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { lazy } from 'react';
import { suspendedComponentWithProps } from '../../lib/suspended_component_with_props';

export const AlertAdd = suspendedComponentWithProps(lazy(() => import('./alert_add')));
export const AlertEdit = suspendedComponentWithProps(lazy(() => import('./alert_edit')));
