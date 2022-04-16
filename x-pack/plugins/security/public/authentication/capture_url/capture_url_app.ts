/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationSetup, FatalErrorsSetup, HttpSetup } from '@kbn/core/public';

import { AUTH_URL_HASH_QUERY_STRING_PARAMETER } from '../../../common/constants';

interface CreateDeps {
  application: ApplicationSetup;
  http: HttpSetup;
  fatalErrors: FatalErrorsSetup;
}

/**
 * Some authentication providers need to know current user URL to, for example, restore it after a
 * complex authentication handshake. But most of the Kibana URLs include hash fragment that is never
 * sent to the server. To capture that authentication provider can redirect user to this app putting
 * path segment into the `next` query string parameter (so that it's not lost during redirect). And
 * since browsers preserve hash fragments during redirects (assuming redirect location doesn't
 * specify its own hash fragment, which is true in our case) this app can capture both path and
 * hash URL segments and re-try request sending hash fragment in a dedicated query string parameter.
 *
 * The flow can look like this:
 * 1. User visits `https://kibana.com/app/kibana#/management/elasticsearch` that initiates authentication.
 * 2. Provider redirect user to `/internal/security/capture-url?next=%2Fapp%2Fkibana&auth_provider_hint=saml1`.
 * 3. Browser preserves hash segment and users ends up at `/internal/security/capture-url?next=%2Fapp%2Fkibana&auth_provider_hint=saml1#/management/elasticsearch`.
 * 4. The app reconstructs original URL, adds `auth_url_hash` query string parameter with the captured hash fragment and redirects user to:
 *    https://kibana.com/app/kibana?auth_provider_hint=saml1&auth_url_hash=%23%2Fmanagement%2Felasticsearch#/management/elasticsearch
 * 5. Once Kibana receives this request, it immediately picks exactly the same provider to handle authentication (based on `auth_provider_hint=saml1`),
 *    and, since it has full URL now (original request path, query string and hash extracted from `auth_url_hash=%23%2Fmanagement%2Felasticsearch`),
 *    it can proceed to a proper authentication handshake.
 */
export const captureURLApp = Object.freeze({
  id: 'security_capture_url',
  create({ application, fatalErrors, http }: CreateDeps) {
    http.anonymousPaths.register('/internal/security/capture-url');
    application.register({
      id: this.id,
      title: 'Capture URL',
      chromeless: true,
      appRoute: '/internal/security/capture-url',
      async mount() {
        try {
          // This is an async import because it requires `url`, which is a sizable dependency.
          // Otherwise this becomes part of the "page load bundle".
          const { parseNext } = await import('../../../common/parse_next');
          const url = new URL(
            parseNext(window.location.href, http.basePath.serverBasePath),
            window.location.origin
          );
          url.searchParams.append(AUTH_URL_HASH_QUERY_STRING_PARAMETER, window.location.hash);
          window.location.replace(url.toString());
        } catch (err) {
          fatalErrors.add(new Error(`Cannot parse current URL: ${err && err.message}.`));
        }

        return () => {};
      },
    });
  },
});
