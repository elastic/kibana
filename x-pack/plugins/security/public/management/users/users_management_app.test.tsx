/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./users_grid', () => ({
  UsersGridPage: (props: any) => `Users Page: ${JSON.stringify(props)}`,
}));

jest.mock('./edit_user', () => ({
  EditUserPage: (props: any) => `User Edit Page: ${JSON.stringify(props)}`,
}));

import { usersManagementApp } from './users_management_app';

import { coreMock, scopedHistoryMock } from '../../../../../../src/core/public/mocks';
import { securityMock } from '../../mocks';

async function mountApp(basePath: string, pathname: string) {
  const container = document.createElement('div');
  const setBreadcrumbs = jest.fn();

  const unmount = await usersManagementApp
    .create({
      authc: securityMock.createSetup().authc,
      getStartServices: coreMock.createSetup().getStartServices as any,
    })
    .mount({
      basePath,
      element: container,
      setBreadcrumbs,
      history: scopedHistoryMock.create({ pathname }),
    });

  return { unmount, container, setBreadcrumbs };
}

describe('usersManagementApp', () => {
  it('create() returns proper management app descriptor', () => {
    expect(
      usersManagementApp.create({
        authc: securityMock.createSetup().authc,
        getStartServices: coreMock.createSetup().getStartServices as any,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": "users",
        "mount": [Function],
        "order": 10,
        "title": "Users",
      }
    `);
  });

  it('mount() works for the `grid` page', async () => {
    const { setBreadcrumbs, container, unmount } = await mountApp('/', '/');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `/`, text: 'Users' }]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Users Page: {"notifications":{"toasts":{}},"userAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"history":{"action":"PUSH","length":1,"location":{"pathname":"/","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `create user` page', async () => {
    const { setBreadcrumbs, container, unmount } = await mountApp('/', '/edit');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `/`, text: 'Users' }, { text: 'Create' }]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        User Edit Page: {"authc":{},"userAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"notifications":{"toasts":{}},"history":{"action":"PUSH","length":1,"location":{"pathname":"/edit","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `edit user` page', async () => {
    const userName = 'foo@bar.com';

    const { setBreadcrumbs, container, unmount } = await mountApp('/', `/edit/${userName}`);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Users' },
      { href: `/edit/${encodeURIComponent(userName)}`, text: userName },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        User Edit Page: {"authc":{},"userAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"notifications":{"toasts":{}},"username":"foo@bar.com","history":{"action":"PUSH","length":1,"location":{"pathname":"/edit/foo@bar.com","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  const usernames = ['foo@bar.com', 'foo&bar.com', 'some 安全性 user'];
  usernames.forEach((username) => {
    it(
      'mount() properly encodes user name in `edit user` page link in breadcrumbs for user ' +
        username,
      async () => {
        const { setBreadcrumbs } = await mountApp('/', `/edit/${username}`);

        expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
        expect(setBreadcrumbs).toHaveBeenCalledWith([
          { href: `/`, text: 'Users' },
          {
            href: `/edit/${encodeURIComponent(username)}`,
            text: username,
          },
        ]);
      }
    );
  });
});
