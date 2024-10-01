/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The identifier in a saved object's `namespaces` array when it is shared globally to all spaces.
 */
export const ALL_SPACES_ID = '*';

/**
 * The identifier in a saved object's `namespaces` array when it is shared to an unknown space (e.g., one that the end user is not authorized to see).
 */
export const UNKNOWN_SPACE = '?';

export const APPLICATION_PREFIX = 'kibana-';

/**
 * The wildcard identifier for all application privileges.
 */
export const PRIVILEGES_ALL_WILDCARD = '*';

/**
 * Reserved application privileges are always assigned to this "wildcard" application.
 * This allows them to be applied to any Kibana "tenant" (`kibana.index`). Since reserved privileges are always assigned to reserved (built-in) roles,
 * it's not possible to know the tenant ahead of time.
 */
export const RESERVED_PRIVILEGES_APPLICATION_WILDCARD = 'kibana-*';

/**
 * This is the key of a query parameter that contains the name of the authentication provider that should be used to
 * authenticate request. It's also used while the user is being redirected during single-sign-on authentication flows.
 * That query parameter is discarded after the authentication flow succeeds. See the `Authenticator`,
 * `OIDCAuthenticationProvider`, and `SAMLAuthenticationProvider` classes for more information.
 */
export const AUTH_PROVIDER_HINT_QUERY_STRING_PARAMETER = 'auth_provider_hint';

/**
 * This is the key of a query parameter that contains metadata about the (client-side) URL hash while the user is being
 * redirected during single-sign-on authentication flows. That query parameter is discarded after the authentication
 * flow succeeds. See the `Authenticator`, `OIDCAuthenticationProvider`, and `SAMLAuthenticationProvider` classes for
 * more information.
 */
export const AUTH_URL_HASH_QUERY_STRING_PARAMETER = 'auth_url_hash';

export const LOGOUT_PROVIDER_QUERY_STRING_PARAMETER = 'provider';
export const LOGOUT_REASON_QUERY_STRING_PARAMETER = 'msg';
export const NEXT_URL_QUERY_STRING_PARAMETER = 'next';

/**
 * If there's a problem validating the session supplied in an AJAX request (i.e. a non-redirectable request),
 * a 401 error is returned. A header with the name defined in `SESSION_ERROR_REASON_HEADER` is added to the
 * HTTP response with more details of the problem.
 */
export const SESSION_ERROR_REASON_HEADER = 'kbn-session-error-reason';

/**
 * Matches valid usernames and role names.
 *
 * - Must contain only letters, numbers, spaces, punctuation and printable symbols.
 * - Must not contain leading or trailing spaces.
 */
export const NAME_REGEX =
  /^(?! )[a-zA-Z0-9 !"#$%&'()*+,\-./\\:;<=>?@\[\]^_`{|}~]*[a-zA-Z0-9!"#$%&'()*+,\-./\\:;<=>?@\[\]^_`{|}~]$/;

/**
 * Matches valid usernames and role names for serverless offering.
 *
 * - Must contain only alphanumeric characters, and non-leading dots, hyphens, or underscores.
 * - Must not contain white spaces characters.
 * - Must not have a leading dot, hyphen, or underscore.
 */
export const SERVERLESS_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

/**
 * Maximum length of usernames and role names.
 */
export const MAX_NAME_LENGTH = 1024;

/**
 * Client session timeout is decreased by this number so that Kibana server can still access session
 * content during logout request to properly clean user session up (invalidate access tokens,
 * redirect to logout portal etc.).
 */
export const SESSION_GRACE_PERIOD_MS = 5 * 1000;

/**
 * Duration we'll normally display the warning toast
 */
export const SESSION_EXPIRATION_WARNING_MS = 5 * 60 * 1000;

/**
 * Current session info is checked this number of milliseconds before the warning toast shows. This
 * will prevent the toast from being shown if the session has already been extended.
 */
export const SESSION_CHECK_MS = 1000;

/**
 * Session will be extended at most once this number of milliseconds while user activity is detected.
 */
export const SESSION_EXTENSION_THROTTLE_MS = 60 * 1000;

/**
 * Route to get session info and extend session expiration
 */
export const SESSION_ROUTE = '/internal/security/session';

/**
 * Allowed image file types for uploading an image as avatar
 */
export const IMAGE_FILE_TYPES = ['image/svg+xml', 'image/jpeg', 'image/png', 'image/gif'];

/**
 * Prefix for API actions.
 */
export const API_OPERATION_PREFIX = 'api:';
