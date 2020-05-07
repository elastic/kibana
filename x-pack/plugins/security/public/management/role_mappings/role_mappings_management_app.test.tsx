/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./role_mappings_grid', () => ({
  RoleMappingsGridPage: (props: any) => `Role Mappings Page: ${JSON.stringify(props)}`,
}));

jest.mock('./edit_role_mapping', () => ({
  EditRoleMappingPage: (props: any) => `Role Mapping Edit Page: ${JSON.stringify(props)}`,
}));

import { roleMappingsManagementApp } from './role_mappings_management_app';

import { coreMock } from '../../../../../../src/core/public/mocks';

async function mountApp(basePath: string) {
  const container = document.createElement('div');
  const setBreadcrumbs = jest.fn();

  const unmount = await roleMappingsManagementApp
    .create({ getStartServices: coreMock.createSetup().getStartServices as any })
    .mount({ basePath, element: container, setBreadcrumbs });

  return { unmount, container, setBreadcrumbs };
}

describe('roleMappingsManagementApp', () => {
  it('create() returns proper management app descriptor', () => {
    expect(
      roleMappingsManagementApp.create({
        getStartServices: coreMock.createSetup().getStartServices as any,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": "role_mappings",
        "mount": [Function],
        "order": 40,
        "title": "Role Mappings",
      }
    `);
  });

  it('mount() works for the `grid` page', async () => {
    const basePath = '/some-base-path/role_mappings';
    window.location.hash = basePath;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `#${basePath}`, text: 'Role Mappings' }]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Mappings Page: {"notifications":{"toasts":{}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"roleMappingsAPI":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"docLinks":{"esDocBasePath":"https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/"}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `create role mapping` page', async () => {
    const basePath = '/some-base-path/role_mappings';
    window.location.hash = `${basePath}/edit`;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `#${basePath}`, text: 'Role Mappings' },
      { text: 'Create' },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Mapping Edit Page: {"roleMappingsAPI":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"notifications":{"toasts":{}},"docLinks":{"esDocBasePath":"https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/"}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `edit role mapping` page', async () => {
    const basePath = '/some-base-path/role_mappings';
    const roleMappingName = 'someRoleMappingName';
    window.location.hash = `${basePath}/edit/${roleMappingName}`;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `#${basePath}`, text: 'Role Mappings' },
      { href: `#/some-base-path/role_mappings/edit/${roleMappingName}`, text: roleMappingName },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Mapping Edit Page: {"name":"someRoleMappingName","roleMappingsAPI":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{}}},"notifications":{"toasts":{}},"docLinks":{"esDocBasePath":"https://www.elastic.co/guide/en/elasticsearch/reference/mocked-test-branch/"}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() properly encodes role mapping name in `edit role mapping` page link in breadcrumbs', async () => {
    const basePath = '/some-base-path/role_mappings';
    const roleMappingName = 'some 安全性 role mapping';
    window.location.hash = `${basePath}/edit/${roleMappingName}`;

    const { setBreadcrumbs } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `#${basePath}`, text: 'Role Mappings' },
      {
        href:
          '#/some-base-path/role_mappings/edit/some%20%E5%AE%89%E5%85%A8%E6%80%A7%20role%20mapping',
        text: roleMappingName,
      },
    ]);
  });
});
