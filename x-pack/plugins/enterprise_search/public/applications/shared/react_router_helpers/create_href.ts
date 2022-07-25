/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';

import { HttpSetup } from '@kbn/core/public';

/**
 * This helper uses React Router's createHref function to generate links with router basenames included.
 * For example, if we perform navigateToUrl('/engines') within App Search, we expect the app basename
 * to be taken into account & intelligently routed to '/app/enterprise_search/app_search/engines'.
 *
 * This helper accomplishes that, while still giving us an escape hatch for navigation *between* apps.
 * For example, if we want to navigate the user from App Search to Enterprise Search we could
 * navigateToUrl('/app/enterprise_search', { shouldNotCreateHref: true })
 *
 * Said escape hatch should still contain all of Kibana's basepaths - for example,
 * 'localhost:5601/xyz' when developing locally, or '/s/some-custom-space/' for space basepaths.
 * See: https://www.elastic.co/guide/en/kibana/master/kibana-navigation.html
 *
 * Links completely outside of Kibana should not use our React Router helpers or navigateToUrl.
 */
interface CreateHrefDeps {
  history: History;
  http: HttpSetup;
}
export interface CreateHrefOptions {
  shouldNotCreateHref?: boolean;
}

export const createHref = (
  path: string,
  { history, http }: CreateHrefDeps,
  { shouldNotCreateHref }: CreateHrefOptions = {}
): string => {
  return shouldNotCreateHref ? http.basePath.prepend(path) : history.createHref({ pathname: path });
};
