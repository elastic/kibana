/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { SecurityFlyout, SecurityFlyoutActionWithScope, SecurityFlyoutState } from './model';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/flyout');

export const initializeSecurityFlyoutFromUrl = actionCreator<SecurityFlyoutState>(
  'INITIALIZE_SECURITY_FLYOUT_FROM_URL'
);

// Security flyout can be opened both in the global scope and the timeline scope
export const openSecurityFlyoutByScope = actionCreator<
  SecurityFlyoutActionWithScope<SecurityFlyout>
>('OPEN_SECURITY_FLYOUT_BY_SCOPE');

export const closeSecurityFlyoutByScope =
  actionCreator<SecurityFlyoutActionWithScope>('CLOSE_FLYOUT');
