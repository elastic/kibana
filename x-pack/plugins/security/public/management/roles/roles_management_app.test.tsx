/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { licenseMock } from '../../../common/licensing/index.mock';

jest.mock('./roles_grid', () => ({
  RolesGridPage: (props: any) => `Roles Page: ${JSON.stringify(props)}`,
}));

jest.mock('./edit_role', () => ({
  EditRolePage: (props: any) => `Role Edit Page: ${JSON.stringify(props)}`,
}));

import { rolesManagementApp } from './roles_management_app';

import { coreMock } from '../../../../../../src/core/public/mocks';
import { featuresPluginMock } from '../../../../features/public/mocks';

async function mountApp(basePath: string) {
  const { fatalErrors } = coreMock.createSetup();
  const container = document.createElement('div');
  const setBreadcrumbs = jest.fn();

  const featuresStart = featuresPluginMock.createStart();

  const unmount = await rolesManagementApp
    .create({
      license: licenseMock.create(),
      fatalErrors,
      getStartServices: jest
        .fn()
        .mockResolvedValue([coreMock.createStart(), { data: {}, features: featuresStart }]),
    })
    .mount({ basePath, element: container, setBreadcrumbs });

  return { unmount, container, setBreadcrumbs };
}

describe('rolesManagementApp', () => {
  it('create() returns proper management app descriptor', () => {
    const { fatalErrors, getStartServices } = coreMock.createSetup();

    expect(
      rolesManagementApp.create({
        license: licenseMock.create(),
        fatalErrors,
        getStartServices: getStartServices as any,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": "roles",
        "mount": [Function],
        "order": 20,
        "title": "Roles",
      }
    `);
  });

  it('mount() works for the `grid` page', async () => {
    const basePath = '/some-base-path/roles';
    window.location.hash = basePath;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `#${basePath}`, text: 'Roles' }]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Roles Page: {"notifications":{"toasts":{}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `create role` page', async () => {
    const basePath = '/some-base-path/roles';
    window.location.hash = `${basePath}/edit`;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `#${basePath}`, text: 'Roles' },
      { text: 'Create' },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Edit Page: {"action":"edit","rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"userAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"indicesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"privilegesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}},"notifications":{"toasts":{}},"fatalErrors":{},"license":{"features$":{"_isScalar":false}},"docLinks":{"esDocBasePath":"https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/"},"uiCapabilities":{"catalogue":{},"management":{},"navLinks":{}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `edit role` page', async () => {
    const basePath = '/some-base-path/roles';
    const roleName = 'someRoleName';
    window.location.hash = `${basePath}/edit/${roleName}`;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `#${basePath}`, text: 'Roles' },
      { href: `#/some-base-path/roles/edit/${roleName}`, text: roleName },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Edit Page: {"action":"edit","roleName":"someRoleName","rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"userAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"indicesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"privilegesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}},"notifications":{"toasts":{}},"fatalErrors":{},"license":{"features$":{"_isScalar":false}},"docLinks":{"esDocBasePath":"https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/"},"uiCapabilities":{"catalogue":{},"management":{},"navLinks":{}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `clone role` page', async () => {
    const basePath = '/some-base-path/roles';
    const roleName = 'someRoleName';
    window.location.hash = `${basePath}/clone/${roleName}`;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `#${basePath}`, text: 'Roles' },
      { text: 'Create' },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Edit Page: {"action":"clone","roleName":"someRoleName","rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"userAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"indicesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"privilegesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}},"notifications":{"toasts":{}},"fatalErrors":{},"license":{"features$":{"_isScalar":false}},"docLinks":{"esDocBasePath":"https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/"},"uiCapabilities":{"catalogue":{},"management":{},"navLinks":{}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() properly encodes role name in `edit role` page link in breadcrumbs', async () => {
    const basePath = '/some-base-path/roles';
    const roleName = 'some 安全性 role';
    window.location.hash = `${basePath}/edit/${roleName}`;

    const { setBreadcrumbs } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `#${basePath}`, text: 'Roles' },
      {
        href: '#/some-base-path/roles/edit/some%20%E5%AE%89%E5%85%A8%E6%80%A7%20role',
        text: roleName,
      },
    ]);
  });
});
