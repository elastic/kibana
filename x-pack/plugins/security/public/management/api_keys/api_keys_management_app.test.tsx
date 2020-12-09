/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./api_keys_grid', () => ({
  APIKeysGridPage: (props: any) => `Page: ${JSON.stringify(props)}`,
}));
import { apiKeysManagementApp } from './api_keys_management_app';
import { coreMock, scopedHistoryMock } from '../../../../../../src/core/public/mocks';

describe('apiKeysManagementApp', () => {
  it('create() returns proper management app descriptor', () => {
    const { getStartServices } = coreMock.createSetup();

    expect(apiKeysManagementApp.create({ getStartServices: getStartServices as any }))
      .toMatchInlineSnapshot(`
      Object {
        "id": "api_keys",
        "mount": [Function],
        "order": 30,
        "title": "API Keys",
      }
    `);
  });

  it('mount() works for the `grid` page', async () => {
    const { getStartServices } = coreMock.createSetup();

    const startServices = await getStartServices();
    const docTitle = startServices[0].chrome.docTitle;

    const container = document.createElement('div');

    const setBreadcrumbs = jest.fn();
    const unmount = await apiKeysManagementApp
      .create({ getStartServices: () => Promise.resolve(startServices) as any })
      .mount({
        basePath: '/some-base-path',
        element: container,
        setBreadcrumbs,
        history: scopedHistoryMock.create(),
      });

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: '/', text: 'API Keys' }]);
    expect(docTitle.change).toHaveBeenCalledWith('API Keys');
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        Page: {"notifications":{"toasts":{}},"apiKeysAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}}}
      </div>
    `);

    unmount();
    expect(docTitle.reset).toHaveBeenCalledTimes(1);

    expect(container).toMatchInlineSnapshot(`<div />`);
  });
});
