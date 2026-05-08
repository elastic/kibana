/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Kibana origin from `KIBANA_URL` or Cypress `baseUrl` (trimmed). Shared with `loginAs` and global_settings POST. */
export function resolveKibanaOrigin(): string | undefined {
  const fromEnv = Cypress.env('KIBANA_URL') as string | undefined;
  const fromConfig = Cypress.config('baseUrl') as string | undefined;
  const raw = fromEnv ?? fromConfig;
  if (!raw) {
    return undefined;
  }
  return raw.replace(/\/+$/, '');
}

/**
 * Persist `hideAnnouncements` globally so the Agent Builder announcement modal
 * does not block UI (e.g. when running cypress:open without FTR uiSettings, or if
 * global defaults have not applied before first paint).
 */
export const suppressGlobalAnnouncements = (): Cypress.Chainable<Cypress.Response<unknown>> => {
  const kibanaOrigin = resolveKibanaOrigin();
  const user = Cypress.env('ELASTICSEARCH_USERNAME') ?? 'elastic';
  const pass = Cypress.env('ELASTICSEARCH_PASSWORD') ?? 'changeme';

  if (!kibanaOrigin) {
    cy.log(
      'suppressGlobalAnnouncements: skipping (set KIBANA_URL or cypress baseUrl for global_settings POST)'
    );
    // No HTTP call; chain type matches cy.request for callers that do not read the body.
    return cy.wrap(null as unknown as Cypress.Response<unknown>, { log: false });
  }

  return cy.request({
    method: 'POST',
    url: `${kibanaOrigin}/internal/kibana/global_settings`,
    body: { changes: { hideAnnouncements: true } },
    headers: { 'kbn-xsrf': 'e2e_test' },
    auth: { user, pass },
    failOnStatusCode: false,
  });
};
