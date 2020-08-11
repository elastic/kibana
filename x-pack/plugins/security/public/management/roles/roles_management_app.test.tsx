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

import { coreMock, scopedHistoryMock } from '../../../../../../src/core/public/mocks';
import { featuresPluginMock } from '../../../../features/public/mocks';

async function mountApp(basePath: string, pathname: string) {
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
    .mount({
      basePath,
      element: container,
      setBreadcrumbs,
      history: scopedHistoryMock.create({ pathname }),
    });

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
    const { setBreadcrumbs, container, unmount } = await mountApp('/', '/');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `/`, text: 'Roles' }]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Roles Page: {"notifications":{"toasts":{}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"history":{"action":"PUSH","length":1,"location":{"pathname":"/","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `create role` page', async () => {
    const { setBreadcrumbs, container, unmount } = await mountApp('/', '/edit');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `/`, text: 'Roles' }, { text: 'Create' }]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Edit Page: {"action":"edit","rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"userAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"indicesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"privilegesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}},"notifications":{"toasts":{}},"fatalErrors":{},"license":{"features$":{"_isScalar":false}},"docLinks":{"esDocBasePath":"https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/"},"uiCapabilities":{"catalogue":{},"management":{},"navLinks":{}},"history":{"action":"PUSH","length":1,"location":{"pathname":"/edit","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `edit role` page', async () => {
    const roleName = 'someRoleName';

    const { setBreadcrumbs, container, unmount } = await mountApp('/', `/edit/${roleName}`);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Roles' },
      { href: `/edit/${roleName}`, text: roleName },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Edit Page: {"action":"edit","roleName":"someRoleName","rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"userAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"indicesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"privilegesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}},"notifications":{"toasts":{}},"fatalErrors":{},"license":{"features$":{"_isScalar":false}},"docLinks":{"esDocBasePath":"https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/"},"uiCapabilities":{"catalogue":{},"management":{},"navLinks":{}},"history":{"action":"PUSH","length":1,"location":{"pathname":"/edit/someRoleName","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `clone role` page', async () => {
    const roleName = 'someRoleName';

    const { setBreadcrumbs, container, unmount } = await mountApp('/', `/clone/${roleName}`);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `/`, text: 'Roles' }, { text: 'Create' }]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Edit Page: {"action":"clone","roleName":"someRoleName","rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"userAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"indicesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"privilegesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}},"notifications":{"toasts":{}},"fatalErrors":{},"license":{"features$":{"_isScalar":false}},"docLinks":{"esDocBasePath":"https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/"},"uiCapabilities":{"catalogue":{},"management":{},"navLinks":{}},"history":{"action":"PUSH","length":1,"location":{"pathname":"/clone/someRoleName","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() properly encodes role name in `edit role` page link in breadcrumbs', async () => {
    const roleName = 'some 安全性 role';

    const { setBreadcrumbs } = await mountApp('/', `/edit/${roleName}`);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Roles' },
      {
        href: '/edit/some%20%E5%AE%89%E5%85%A8%E6%80%A7%20role',
        text: roleName,
      },
    ]);
  });
});
