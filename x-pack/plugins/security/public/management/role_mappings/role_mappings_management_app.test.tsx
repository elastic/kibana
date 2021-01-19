/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./role_mappings_grid', () => ({
  RoleMappingsGridPage: (props: any) =>
    // `docLinks` object is too big to include into test snapshot, so we just check its existence.
    `Role Mappings Page: ${JSON.stringify({
      ...props,
      docLinks: props.docLinks ? {} : undefined,
    })}`,
}));

jest.mock('./edit_role_mapping', () => ({
  EditRoleMappingPage: (props: any) =>
    // `docLinks` object is too big to include into test snapshot, so we just check its existence.
    `Role Mapping Edit Page: ${JSON.stringify({
      ...props,
      docLinks: props.docLinks ? {} : undefined,
    })}`,
}));

import { roleMappingsManagementApp } from './role_mappings_management_app';
import { coreMock, scopedHistoryMock } from '../../../../../../src/core/public/mocks';

async function mountApp(basePath: string, pathname: string) {
  const container = document.createElement('div');
  const setBreadcrumbs = jest.fn();

  const unmount = await roleMappingsManagementApp
    .create({ getStartServices: coreMock.createSetup().getStartServices as any })
    .mount({
      basePath,
      element: container,
      setBreadcrumbs,
      history: scopedHistoryMock.create({ pathname }),
    });

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
    const { setBreadcrumbs, container, unmount } = await mountApp('/', '/');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `/`, text: 'Role Mappings' }]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Mappings Page: {"notifications":{"toasts":{}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}},"roleMappingsAPI":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}},"docLinks":{},"history":{"action":"PUSH","length":1,"location":{"pathname":"/","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `create role mapping` page', async () => {
    const { setBreadcrumbs, container, unmount } = await mountApp('/', '/edit');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Role Mappings' },
      { text: 'Create' },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Mapping Edit Page: {"roleMappingsAPI":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}},"notifications":{"toasts":{}},"docLinks":{},"history":{"action":"PUSH","length":1,"location":{"pathname":"/edit","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `edit role mapping` page', async () => {
    const roleMappingName = 'role@mapping';

    const { setBreadcrumbs, container, unmount } = await mountApp('/', `/edit/${roleMappingName}`);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Role Mappings' },
      { href: `/edit/${encodeURIComponent(roleMappingName)}`, text: roleMappingName },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Mapping Edit Page: {"name":"role@mapping","roleMappingsAPI":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}},"notifications":{"toasts":{}},"docLinks":{},"history":{"action":"PUSH","length":1,"location":{"pathname":"/edit/role@mapping","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() properly encodes role mapping name in `edit role mapping` page link in breadcrumbs', async () => {
    const roleMappingName = 'some 安全性 role mapping';

    const { setBreadcrumbs } = await mountApp('/', `/edit/${roleMappingName}`);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Role Mappings' },
      {
        href: '/edit/some%20%E5%AE%89%E5%85%A8%E6%80%A7%20role%20mapping',
        text: roleMappingName,
      },
    ]);
  });
});
