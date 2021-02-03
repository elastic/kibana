/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * The identifier in a saved object's `namespaces` array when it is shared globally to all spaces.
 */
export const ALL_SPACES_ID = '*';

/**
 * The identifier in a saved object's `namespaces` array when it is shared to an unknown space (e.g., one that the end user is not authorized to see).
 */
export const UNKNOWN_SPACE = '?';

export const GLOBAL_RESOURCE = '*';
export const APPLICATION_PREFIX = 'kibana-';
export const RESERVED_PRIVILEGES_APPLICATION_WILDCARD = 'kibana-*';

export const AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER = 'auth_provider_hint';
export const LOGOUT_PROVIDER_QUERY_STRING_PARAMETER = 'provider';
export const LOGOUT_REASON_QUERY_STRING_PARAMETER = 'msg';
export const NEXT_URL_QUERY_STRING_PARAMETER = 'next';

/**
 * Matches valid usernames and role names.
 *
 * - Must contain only letters, numbers, spaces, punctuation and printable symbols.
 * - Must not contain leading or trailing spaces.
 */
export const NAME_REGEX = /^(?! )[a-zA-Z0-9 !"#$%&'()*+,\-./\\:;<=>?@\[\]^_`{|}~]*[a-zA-Z0-9!"#$%&'()*+,\-./\\:;<=>?@\[\]^_`{|}~]$/;

/**
 * Maximum length of usernames and role names.
 */
export const MAX_NAME_LENGTH = 1024;
