/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchPath } from 'react-router-dom';
import { createSelector } from 'reselect';
import { PolicyDetailsSelector, PolicyDetailsState } from '../../../types';
import {
  MANAGEMENT_ROUTING_POLICY_DETAILS_FORM_PATH,
  MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH,
} from '../../../../../common/constants';

/**
 * Returns current artifacts location
 */
export const getCurrentArtifactsLocation: PolicyDetailsSelector<
  PolicyDetailsState['artifacts']['location']
> = (state) => state.artifacts.location;

export const getUrlLocationPathname: PolicyDetailsSelector<string | undefined> = (state) =>
  state.location?.pathname;

/** Returns a boolean of whether the user is on the policy form page or not */
export const isOnPolicyFormView: PolicyDetailsSelector<boolean> = createSelector(
  getUrlLocationPathname,
  (pathname) => {
    return (
      matchPath(pathname ?? '', {
        path: MANAGEMENT_ROUTING_POLICY_DETAILS_FORM_PATH,
        exact: true,
      }) !== null
    );
  }
);

/** Returns a boolean of whether the user is on the policy details page or not */
export const isOnPolicyTrustedAppsView: PolicyDetailsSelector<boolean> = createSelector(
  getUrlLocationPathname,
  (pathname) => {
    return (
      matchPath(pathname ?? '', {
        path: MANAGEMENT_ROUTING_POLICY_DETAILS_TRUSTED_APPS_PATH,
        exact: true,
      }) !== null
    );
  }
);
