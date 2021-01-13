/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./api_keys_grid', () => ({
  APIKeysGridPage: (props: any) =>
    // `docLinks` object is too big to include into test snapshot, so we just check its existence.
    `Page: ${JSON.stringify({ ...props, docLinks: props.docLinks ? {} : undefined })}`,
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
    const container = document.createElement('div');

    const setBreadcrumbs = jest.fn();
    const unmount = await apiKeysManagementApp
      .create({ getStartServices: getStartServices as any })
      .mount({
        basePath: '/some-base-path',
        element: container,
        setBreadcrumbs,
        history: scopedHistoryMock.create(),
      });

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ href: '/', text: 'API Keys' }]);
    expect(container).toMatchInlineSnapshot(`
      <div>
        Page: {"notifications":{"toasts":{}},"docLinks":{},"apiKeysAPIClient":{"http":{"basePath":{"basePath":"","serverBasePath":""},"anonymousPaths":{},"externalUrl":{}}}}
      </div>
    `);

    unmount();

    expect(container).toMatchInlineSnapshot(`<div />`);
  });
});
