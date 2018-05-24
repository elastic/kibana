/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export {
  addSpaceUrlContext,
  stripSpaceUrlContext,
  getSpaceUrlContext,
} from './spaces_url_parser';

export {
  DEFAULT_SPACE_ID,
  SELECTED_SPACE_COOKIE,
  SELECTED_SPACE_COOKIE_TTL_MILLIS,
} from './constants';
