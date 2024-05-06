/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lazy } from 'react';
import { suspendedComponentWithProps } from '../../lib/suspended_component_with_props';

export const AlertsTable = suspendedComponentWithProps(lazy(() => import('./alerts_table')));
