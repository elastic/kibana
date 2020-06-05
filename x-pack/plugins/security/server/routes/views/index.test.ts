/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defineViewRoutes } from '.';

import { routeDefinitionParamsMock } from '../index.mock';

describe('View routes', () => {
  it('does not register Login routes if both `basic` and `token` providers are disabled', () => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    routeParamsMock.authc.isProviderTypeEnabled.mockImplementation(
      (provider) => provider !== 'basic' && provider !== 'token'
    );

    defineViewRoutes(routeParamsMock);

    expect(routeParamsMock.router.get.mock.calls.map(([{ path }]) => path)).toMatchInlineSnapshot(`
      Array [
        "/security/account",
        "/security/logged_out",
        "/logout",
        "/security/overwritten_session",
      ]
    `);
  });

  it('registers Login routes if `basic` provider is enabled', () => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    routeParamsMock.authc.isProviderTypeEnabled.mockImplementation(
      (provider) => provider !== 'token'
    );

    defineViewRoutes(routeParamsMock);

    expect(routeParamsMock.router.get.mock.calls.map(([{ path }]) => path)).toMatchInlineSnapshot(`
      Array [
        "/login",
        "/internal/security/login_state",
        "/security/account",
        "/security/logged_out",
        "/logout",
        "/security/overwritten_session",
      ]
    `);
  });

  it('registers Login routes if `token` provider is enabled', () => {
    const routeParamsMock = routeDefinitionParamsMock.create();
    routeParamsMock.authc.isProviderTypeEnabled.mockImplementation(
      (provider) => provider !== 'basic'
    );

    defineViewRoutes(routeParamsMock);

    expect(routeParamsMock.router.get.mock.calls.map(([{ path }]) => path)).toMatchInlineSnapshot(`
      Array [
        "/login",
        "/internal/security/login_state",
        "/security/account",
        "/security/logged_out",
        "/logout",
        "/security/overwritten_session",
      ]
    `);
  });

  it('registers Login routes if Login Selector is enabled even if both `token` and `basic` providers are not enabled', () => {
    const routeParamsMock = routeDefinitionParamsMock.create({
      authc: { selector: { enabled: true } },
    });
    routeParamsMock.authc.isProviderTypeEnabled.mockReturnValue(false);

    defineViewRoutes(routeParamsMock);

    expect(routeParamsMock.router.get.mock.calls.map(([{ path }]) => path)).toMatchInlineSnapshot(`
      Array [
        "/login",
        "/internal/security/login_state",
        "/security/account",
        "/security/logged_out",
        "/logout",
        "/security/overwritten_session",
      ]
    `);
  });
});
