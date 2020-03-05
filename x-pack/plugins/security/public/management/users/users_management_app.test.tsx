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

import { coreMock } from '../../../../../../src/core/public/mocks';
import { securityMock } from '../../mocks';

async function mountApp(basePath: string) {
  const container = document.createElement('div');
  const setBreadcrumbs = jest.fn();

  const unmount = await usersManagementApp
    .create({
      authc: securityMock.createSetup().authc,
      getStartServices: coreMock.createSetup().getStartServices as any,
    })
    .mount({ basePath, element: container, setBreadcrumbs });

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
    const basePath = '/some-base-path/users';
    window.location.hash = basePath;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `#${basePath}`, text: 'Users' }]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Users Page: {"notifications":{"toasts":{}},"userAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `create user` page', async () => {
    const basePath = '/some-base-path/users';
    window.location.hash = `${basePath}/edit`;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `#${basePath}`, text: 'Users' },
      { text: 'Create' },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        User Edit Page: {"authc":{},"userAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"notifications":{"toasts":{}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `edit user` page', async () => {
    const basePath = '/some-base-path/users';
    const userName = 'someUserName';
    window.location.hash = `${basePath}/edit/${userName}`;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `#${basePath}`, text: 'Users' },
      { href: `#/some-base-path/users/edit/${userName}`, text: userName },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        User Edit Page: {"authc":{},"userAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"notifications":{"toasts":{}},"username":"someUserName"}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() properly encodes user name in `edit user` page link in breadcrumbs', async () => {
    const basePath = '/some-base-path/users';
    const username = 'some 安全性 user';
    window.location.hash = `${basePath}/edit/${username}`;

    const { setBreadcrumbs } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `#${basePath}`, text: 'Users' },
      {
        href: '#/some-base-path/users/edit/some%20%E5%AE%89%E5%85%A8%E6%80%A7%20user',
        text: username,
      },
    ]);
  });
});
