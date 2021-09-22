/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ImmutableMiddlewareFactory } from '../../../../../../common/store';
import { PolicyDetailsState } from '../../../types';
import { policyTrustedAppsMiddlewareRunner } from './policy_trusted_apps_middleware';
import { policySettingsMiddlewareRunner } from './policy_settings_middleware';

export const policyDetailsMiddlewareFactory: ImmutableMiddlewareFactory<PolicyDetailsState> = (
  coreStart
) => {
  return (store) => (next) => async (action) => {
    next(action);

    policySettingsMiddlewareRunner(coreStart, store, action);
    policyTrustedAppsMiddlewareRunner(coreStart, store, action);
  };
};
