/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

import { coreMock, scopedHistoryMock, themeServiceMock } from 'src/core/public/mocks';

import { featuresPluginMock } from '../../../features/public/mocks';
import type { PluginsStart } from '../plugin';
import { spacesManagerMock } from '../spaces_manager/mocks';
import { spacesManagementApp } from './spaces_management_app';

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

  const [coreStart, pluginsStart] = await coreMock.createSetup().getStartServices();
  (pluginsStart as PluginsStart).features = featuresPluginMock.createStart();

  const unmount = await spacesManagementApp
    .create({
      spacesManager,
      getStartServices: async () => [coreStart, pluginsStart as PluginsStart, {}],
    })
    .mount({
      basePath,
      element: container,
      setBreadcrumbs,
      history: scopedHistoryMock.create({ pathname }),
      theme$: themeServiceMock.createTheme$(),
    });

  return { unmount, container, setBreadcrumbs, docTitle: coreStart.chrome.docTitle };
}

describe('spacesManagementApp', () => {
  it('create() returns proper management app descriptor', () => {
    expect(
      spacesManagementApp.create({
        spacesManager: spacesManagerMock.create(),
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
    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp('/', '/');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ text: 'Spaces' }]);
    expect(docTitle.change).toHaveBeenCalledWith('Spaces');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        <div
          class="kbnAppWrapper kbnRedirectCrossAppLinks"
        >
          Spaces Page: {"capabilities":{"catalogue":{},"management":{},"navLinks":{}},"notifications":{"toasts":{}},"spacesManager":{"onActiveSpaceChange$":{"_isScalar":false}},"history":{"action":"PUSH","length":1,"location":{"pathname":"/","search":"","hash":""}}}
        </div>
      </div>
    `);

    unmount();

    expect(docTitle.reset).toHaveBeenCalledTimes(1);
    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `create space` page', async () => {
    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp('/', '/create');

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Spaces' },
      { text: 'Create' },
    ]);
    expect(docTitle.change).toHaveBeenCalledWith('Spaces');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        <div
          class="kbnAppWrapper kbnRedirectCrossAppLinks"
        >
          Spaces Edit Page: {"capabilities":{"catalogue":{},"management":{},"navLinks":{}},"notifications":{"toasts":{}},"spacesManager":{"onActiveSpaceChange$":{"_isScalar":false}},"history":{"action":"PUSH","length":1,"location":{"pathname":"/create","search":"","hash":""}}}
        </div>
      </div>
    `);

    unmount();
    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });

  it('mount() works for the `edit space` page', async () => {
    const spaceId = 'some-space';

    const { setBreadcrumbs, container, unmount, docTitle } = await mountApp(
      '/',
      `/edit/${spaceId}`,
      spaceId
    );

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([
      { href: `/`, text: 'Spaces' },
      { text: `space with id some-space` },
    ]);
    expect(docTitle.change).toHaveBeenCalledWith('Spaces');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        <div
          class="kbnAppWrapper kbnRedirectCrossAppLinks"
        >
          Spaces Edit Page: {"capabilities":{"catalogue":{},"management":{},"navLinks":{}},"notifications":{"toasts":{}},"spacesManager":{"onActiveSpaceChange$":{"_isScalar":false}},"spaceId":"some-space","history":{"action":"PUSH","length":1,"location":{"pathname":"/edit/some-space","search":"","hash":""}}}
        </div>
      </div>
    `);

    unmount();
    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });
});
