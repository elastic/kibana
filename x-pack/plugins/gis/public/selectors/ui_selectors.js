/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { createSelector } from 'reselect';

export const getBannerVisible = ({ ui }) => ui && ui.bannerVisible;

export const getNavExpanded = ({ ui }) => ui && ui.navExpanded;

export const detectExternalUIChanges = createSelector(
  getBannerVisible,
  getNavExpanded,
  (bannerVisible, navExpanded) => [ bannerVisible, navExpanded ]
);