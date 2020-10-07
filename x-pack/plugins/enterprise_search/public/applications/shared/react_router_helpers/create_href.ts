/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History } from 'history';

/**
 * This helper uses React Router's createHref function to generate links with router basenames accounted for.
 * For example, if we perform navigateToUrl('/engines') within App Search, we expect the app basename
 * to be taken into account to be intelligently routed to '/app/enterprise_search/app_search/engines'.
 *
 * This helper accomplishes that, while still giving us an escape hatch for navigation *between* apps.
 * For example, if we want to navigate the user from App Search to Enterprise Search we could
 * navigateToUrl('/app/enterprise_search', { shouldNotCreateHref: true })
 */
export interface ICreateHrefOptions {
  shouldNotCreateHref?: boolean;
}
export const createHref = (
  path: string,
  history: History,
  options?: ICreateHrefOptions
): string => {
  return options?.shouldNotCreateHref ? path : history.createHref({ pathname: path });
};
