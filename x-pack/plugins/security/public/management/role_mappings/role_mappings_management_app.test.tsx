/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react';
import { noop } from 'lodash';

import { coreMock, scopedHistoryMock, themeServiceMock } from '@kbn/core/public/mocks';
import type { Unmount } from '@kbn/management-plugin/public/types';

import { roleMappingsManagementApp } from './role_mappings_management_app';

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

async function mountApp(basePath: string, pathname: string) {
  const container = document.createElement('div');
  const setBreadcrumbs = jest.fn();

  const startServices = await coreMock.createSetup().getStartServices();

  let unmount: Unmount = noop;
  await act(async () => {
    unmount = await roleMappingsManagementApp
      .create({ getStartServices: () => Promise.resolve(startServices) as any })
      .mount({
        basePath,
        element: container,
        setBreadcrumbs,
        history: scopedHistoryMock.create({ pathname }),
        theme$: themeServiceMock.createTheme$(),
      });
  });

  return { unmount, container, setBreadcrumbs, docTitle: startServices[0].chrome.docTitle };
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
    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp('/', '/');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ text: 'Role Mappings' }]);
    expect(docTitle.change).toHaveBeenCalledWith('Role Mappings');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Mappings Page: {"notifications":{"toasts":{}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}},"roleMappingsAPI":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}},"docLinks":{},"history":{"action":"PUSH","length":1,"location":{"pathname":"/","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `create role mapping` page', async () => {
    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp('/', '/edit');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Role Mappings' },
      { text: 'Create' },
    ]);
    expect(docTitle.change).toHaveBeenCalledWith('Role Mappings');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Mapping Edit Page: {"action":"edit","roleMappingsAPI":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}},"notifications":{"toasts":{}},"docLinks":{},"history":{"action":"PUSH","length":1,"location":{"pathname":"/edit","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `edit role mapping` page', async () => {
    const roleMappingName = 'role@mapping';

    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp(
      '/',
      `/edit/${roleMappingName}`
    );

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: '/', text: 'Role Mappings' },
      { text: roleMappingName },
    ]);
    expect(docTitle.change).toHaveBeenCalledWith('Role Mappings');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        Role Mapping Edit Page: {"action":"edit","name":"role@mapping","roleMappingsAPI":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}},"rolesAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}},"notifications":{"toasts":{}},"docLinks":{},"history":{"action":"PUSH","length":1,"location":{"pathname":"/edit/role@mapping","search":"","hash":""}}}
      </div>
    `);

    unmount();

    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() properly encodes role mapping name in `edit role mapping` page link in breadcrumbs', async () => {
    const roleMappingName = 'some 安全性 role mapping';

    const { setBreadcrumbs } = await mountApp('/', `/edit/${roleMappingName}`);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: '/', text: 'Role Mappings' },
      {
        text: roleMappingName,
      },
    ]);
  });
});
