/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./api_keys_grid', () => ({
  APIKeysGridPage: (props: any) => JSON.stringify(props, null, 2),
}));

import { act } from '@testing-library/react';

import { coreMock, scopedHistoryMock, themeServiceMock } from 'src/core/public/mocks';
import type { Unmount } from 'src/plugins/management/public/types';

import { securityMock } from '../../mocks';
import { apiKeysManagementApp } from './api_keys_management_app';

describe('apiKeysManagementApp', () => {
  it('create() returns proper management app descriptor', () => {
    const { getStartServices } = coreMock.createSetup();
    const { authc } = securityMock.createSetup();

    expect(apiKeysManagementApp.create({ authc, getStartServices: getStartServices as any }))
      .toMatchInlineSnapshot(`
      Object {
        "id": "api_keys",
        "mount": [Function],
        "order": 30,
        "title": "API keys",
      }
    `);
  });

  it('mount() works for the `grid` page', async () => {
    const { getStartServices } = coreMock.createSetup();
    const { authc } = securityMock.createSetup();

    const startServices = await getStartServices();
    const docTitle = startServices[0].chrome.docTitle;

    const container = document.createElement('div');

    const setBreadcrumbs = jest.fn();
    let unmount: Unmount;
    await act(async () => {
      unmount = await apiKeysManagementApp
        .create({ authc, getStartServices: () => Promise.resolve(startServices) as any })
        .mount({
          basePath: '/some-base-path',
          element: container,
          setBreadcrumbs,
          history: scopedHistoryMock.create(),
          theme$: themeServiceMock.createTheme$(),
        });
    });

    expect(setBreadcrumbs).toHaveBeenCalledTimes(1);
    expect(setBreadcrumbs).toHaveBeenCalledWith([{ text: 'API keys' }]);
    expect(docTitle.change).toHaveBeenCalledWith(['API keys']);
    expect(docTitle.reset).not.toHaveBeenCalled();
    expect(container).toMatchInlineSnapshot(`
      <div>
        {
        "history": {
          "action": "PUSH",
          "length": 1,
          "location": {
            "pathname": "/",
            "search": "",
            "hash": ""
          }
        },
        "notifications": {
          "toasts": {}
        },
        "apiKeysAPIClient": {
          "http": {
            "basePath": {
              "basePath": "",
              "serverBasePath": ""
            },
            "anonymousPaths": {},
            "externalUrl": {}
          }
        }
      }
      </div>
    `);

    unmount!();

    expect(docTitle.reset).toHaveBeenCalledTimes(1);
    expect(container).toMatchInlineSnapshot(`<div />`);
  });
});
