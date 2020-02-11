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

import { coreMock } from '../../../../../src/core/public/mocks';
import { securityMock } from '../../../security/public/mocks';
import { spacesManagerMock } from '../spaces_manager/mocks';
import { SecurityLicenseFeatures } from '../../../security/public';

async function mountApp(basePath: string, spaceId?: string) {
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

  const unmount = await spacesManagementApp
    .create({
      spacesManager,
      securityLicense,
      getStartServices: coreMock.createSetup().getStartServices as any,
    })
    .mount({ basePath, element: container, setBreadcrumbs });

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
        "order": 10,
        "title": "Spaces",
      }
    `);
  });

  it('mount() works for the `grid` page', async () => {
    const basePath = '/some-base-path/spaces';
    window.location.hash = basePath;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: `#${basePath}`, text: 'Spaces' }]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Spaces Page: {"capabilities":{"catalogue":{},"management":{},"navLinks":{}},"http":{"basePath":{"basePath":""},"anonymousPaths":{}},"notifications":{"toasts":{}},"spacesManager":{"onActiveSpaceChange$":{"_isScalar":false}},"securityEnabled":true}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `create space` page', async () => {
    const basePath = '/some-base-path/spaces';
    window.location.hash = `${basePath}/create`;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `#${basePath}`, text: 'Spaces' },
      { text: 'Create' },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Spaces Edit Page: {"capabilities":{"catalogue":{},"management":{},"navLinks":{}},"http":{"basePath":{"basePath":""},"anonymousPaths":{}},"notifications":{"toasts":{}},"spacesManager":{"onActiveSpaceChange$":{"_isScalar":false}},"securityEnabled":true}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `edit space` page', async () => {
    const basePath = '/some-base-path/spaces';
    const spaceId = 'some-space';
    window.location.hash = `${basePath}/edit/${spaceId}`;

    const { setBreadcrumbs, container, unmount } = await mountApp(basePath, spaceId);

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `#${basePath}`, text: 'Spaces' },
      { href: `#/some-base-path/spaces/edit/${spaceId}`, text: `space with id some-space` },
    ]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Spaces Edit Page: {"capabilities":{"catalogue":{},"management":{},"navLinks":{}},"http":{"basePath":{"basePath":""},"anonymousPaths":{}},"notifications":{"toasts":{}},"spacesManager":{"onActiveSpaceChange$":{"_isScalar":false}},"spaceId":"some-space","securityEnabled":true}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });
});
