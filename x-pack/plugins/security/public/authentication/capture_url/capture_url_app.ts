/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse } from 'url';
import { ApplicationSetup, FatalErrorsSetup, HttpSetup } from 'src/core/public';

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
 * hash URL segments and send them back to the authentication provider via login endpoint.
 *
 * The flow can look like this:
 * 1. User visits `/app/kibana#/management/elasticsearch` that initiates authentication.
 * 2. Provider redirect user to `/internal/security/capture-url?next=%2Fapp%2Fkibana&providerType=saml&providerName=saml1`.
 * 3. Browser preserves hash segment and users ends up at `/internal/security/capture-url?next=%2Fapp%2Fkibana&providerType=saml&providerName=saml1#/management/elasticsearch`.
 * 4. The app captures full URL and sends it back as is via login endpoint:
 * {
 *   providerType: 'saml',
 *   providerName: 'saml1',
 *   currentURL: 'https://kibana.com/internal/security/capture-url?next=%2Fapp%2Fkibana&providerType=saml&providerName=saml1#/management/elasticsearch'
 * }
 * 5. Login endpoint handler parses and validates `next` parameter, joins it with the hash segment
 * and finally passes it to the provider that initiated capturing.
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
          const { providerName, providerType } = parse(window.location.href, true).query ?? {};
          if (!providerName || !providerType) {
            fatalErrors.add(new Error('Provider to capture URL for is not specified.'));
            return () => {};
          }

          const { location } = await http.post<{ location: string }>('/internal/security/login', {
            body: JSON.stringify({ providerType, providerName, currentURL: window.location.href }),
          });

          window.location.href = location;
        } catch (err) {
          fatalErrors.add(new Error('Cannot login with captured URL.'));
        }

        return () => {};
      },
    });
  },
});
