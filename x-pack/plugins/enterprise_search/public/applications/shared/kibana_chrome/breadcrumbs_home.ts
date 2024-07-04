/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTERPRISE_SEARCH_OVERVIEW_PLUGIN } from '../../../../common/constants';

/**
 * HACK for base homepage URL, this can be removed and updated to a static
 * URL when Search Homepage is no longer feature flagged.
 */
const breadCrumbHome = { url: ENTERPRISE_SEARCH_OVERVIEW_PLUGIN.URL };
export const getHomeURL = () => breadCrumbHome.url;
export const setBreadcrumbHomeUrl = (url: string) => {
  breadCrumbHome.url = url;
};
