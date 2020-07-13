/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./spaces_grid', () => ({
  SpacesGridPage: (props: any) => `Spaces Page: ${JSON.stringify(props)}`,
}));

jest.mock('./edit_space', () => ({
  ManageSpacePage: (props: any) => {
    if (props.spacesManager && props.onLoadSpace) {
      props.spacesManager.getSpace().then((space: any) => props.onLoadSpace(space));
    }
    return `Spaces Edit Page: ${JSON.stringify(props)}`;
  },
}));

import { spacesManagementApp } from './spaces_management_app';

import { coreMock, scopedHistoryMock } from '../../../../../src/core/public/mocks';
import { securityMock } from '../../../security/public/mocks';
import { spacesManagerMock } from '../spaces_manager/mocks';
import { SecurityLicenseFeatures } from '../../../security/public';
import { featuresPluginMock } from '../../../features/public/mocks';
import { PluginsStart } from '../plugin';

async function mountApp(basePath: string, pathname: string, spaceId?: string) {
  const container = document.createElement('div');
  const setBreadcrumbs = jest.fn();

  const spacesManager = spacesManagerMock.create();
  if (spaceId) {
    spacesManager.getSpace.mockResolvedValue({
      id: spaceId,
      name: `space with id ${spaceId}`,
      disabledFeatures: [],
    });
  }

  const securityLicense = securityMock.createSetup().license;
  securityLicense.getFeatures.mockReturnValue({
    showLinks: true,
  } as SecurityLicenseFeatures);

  const [coreStart, pluginsStart] = await coreMock.createSetup().getStartServices();
  (pluginsStart as PluginsStart).features = featuresPluginMock.createStart();

  const unmount = await spacesManagementApp
    .create({
      spacesManager,
      securityLicense,
      getStartServices: async () => [coreStart, pluginsStart as PluginsStart, {}],
    })
    .mount({
      basePath,
      element: container,
      setBreadcrumbs,
      history: scopedHistoryMock.create({ pathname }),
    });

  return { unmount, container, setBreadcrumbs };
}

describe('spacesManagementApp', () => {
  it('create() returns proper management app descriptor', () => {
    expect(
      spacesManagementApp.create({
        spacesManager: spacesManagerMock.create(),
        securityLicense: securityMock.createSetup().license,
        getStartServices: coreMock.createSetup().getStartServices as any,
      })
    ).toMatchInlineSnapshot(`
      Object {
        "id": "spaces",
        "mount": [Function],
        "order": 2,
        "title": "Spaces",
      }
    `);
  });

  it('mount() works for the `grid` page', async () => {
    const { setBreadcrumbs, container, unmount } = await mountApp('/', '/');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `/`, text: 'Spaces' }]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Spaces Page: {"capabilities":{"catalogue":{},"management":{},"navLinks":{}},"notifications":{"toasts":{}},"spacesManager":{"onActiveSpaceChange$":{"_isScalar":false}},"history":{"action":"PUSH","length":1,"location":{"pathname":"/","search":"","hash":""}},"securityEnabled":true}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `create space` page', async () => {
    const { setBreadcrumbs, container, unmount } = await mountApp('/', '/create');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Spaces' },
      { text: 'Create' },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Spaces Edit Page: {"capabilities":{"catalogue":{},"management":{},"navLinks":{}},"notifications":{"toasts":{}},"spacesManager":{"onActiveSpaceChange$":{"_isScalar":false}},"history":{"action":"PUSH","length":1,"location":{"pathname":"/create","search":"","hash":""}},"securityEnabled":true}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `edit space` page', async () => {
    const spaceId = 'some-space';

    const { setBreadcrumbs, container, unmount } = await mountApp('/', `/edit/${spaceId}`, spaceId);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Spaces' },
      { href: `/edit/${spaceId}`, text: `space with id some-space` },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Spaces Edit Page: {"capabilities":{"catalogue":{},"management":{},"navLinks":{}},"notifications":{"toasts":{}},"spacesManager":{"onActiveSpaceChange$":{"_isScalar":false}},"spaceId":"some-space","history":{"action":"PUSH","length":1,"location":{"pathname":"/edit/some-space","search":"","hash":""}},"securityEnabled":true}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });
});
