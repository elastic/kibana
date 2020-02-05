/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { isReservedSpace } from './is_reserved_space';
export { MAX_SPACE_INITIALS, SPACE_SEARCH_COUNT_THRESHOLD } from './constants';
export { addSpaceIdToPath, getSpaceIdFromPath } from './lib/spaces_url_parser';
