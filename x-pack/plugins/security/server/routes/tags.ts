/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * If, for whatever reason, the API route path doesn't follow the API naming convention and doesn't
 * start with `/api` or `/internal` prefix, it should be marked with this tag explicitly to let
 * Security know that it should be handled as any other API route.
 */
export const ROUTE_TAG_API = 'api';

/**
 * If the route is marked with this tag Security can safely assume that the calling party that sends
 * request to this route can handle redirect responses. It's particularly important if we want the
 * specific route to be able to initiate or participate in the authentication handshake that may
 * involve redirects and will eventually redirect authenticated user to this route.
 */
export const ROUTE_TAG_CAN_REDIRECT = 'security:canRedirect';

/**
 * The routes that are involved into authentication flows, especially if they are used by the 3rd
 * parties, require special handling.
 */
export const ROUTE_TAG_AUTH_FLOW = 'security:authFlow';

/**
 * If `xpack.security.authc.http.jwt.taggedRoutesOnly` flag is set, then only routes marked with this tag will accept
 * JWT as a means of authentication.
 */
export const ROUTE_TAG_ACCEPT_JWT = 'security:acceptJWT';
