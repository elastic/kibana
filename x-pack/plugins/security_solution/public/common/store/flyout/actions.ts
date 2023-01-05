/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import actionCreatorFactory from 'typescript-fsa';
import type { SecurityFlyout, SecurityFlyoutActionWithScope, SecurityFlyoutState } from './model';

const actionCreator = actionCreatorFactory('x-pack/security_solution/local/flyout');

export const initializeSecurityFlyouts = actionCreator<SecurityFlyoutState>('INITIALIZE_FLYOUT');

export const initializeSecurityFlyoutByScope = actionCreator<
  SecurityFlyoutActionWithScope<Required<SecurityFlyout>>
>('INITIALIZE_FLYOUT_BY_SCOPE');

export const closeSecurityFlyout = actionCreator<SecurityFlyoutActionWithScope>('CLOSE_FLYOUT');
