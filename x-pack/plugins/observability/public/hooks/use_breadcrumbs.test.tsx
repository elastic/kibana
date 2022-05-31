/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from '@kbn/core/public';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { useBreadcrumbs } from './use_breadcrumbs';

const setBreadcrumbs = jest.fn();
const setTitle = jest.fn();
const kibanaServices = {
  application: { getUrlForApp: () => {}, navigateToApp: () => {} },
  chrome: { setBreadcrumbs, docTitle: { change: setTitle } },
  uiSettings: { get: () => true },
} as unknown as Partial<CoreStart>;
const KibanaContext = createKibanaReactContext(kibanaServices);

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter>
      <KibanaContext.Provider>{children}</KibanaContext.Provider>
    </MemoryRouter>
  );
}

describe('useBreadcrumbs', () => {
  afterEach(() => {
    setBreadcrumbs.mockClear();
    setTitle.mockClear();
  });

  describe('when setBreadcrumbs and setTitle are not defined', () => {
    it('does not set breadcrumbs or the title', () => {
      renderHook(() => useBreadcrumbs([]), {
        wrapper: ({ children }) => (
          <MemoryRouter>
            <KibanaContext.Provider
              services={
                { ...kibanaServices, chrome: { docTitle: {} } } as unknown as Partial<CoreStart>
              }
            >
              {children}
            </KibanaContext.Provider>
          </MemoryRouter>
        ),
      });

      expect(setBreadcrumbs).not.toHaveBeenCalled();
      expect(setTitle).not.toHaveBeenCalled();
    });
  });

  describe('with an empty array', () => {
    it('sets the overview breadcrumb', () => {
      renderHook(() => useBreadcrumbs([]), { wrapper: Wrapper });

      expect(setBreadcrumbs).toHaveBeenCalledWith([
        { href: '/overview', onClick: expect.any(Function), text: 'Observability' },
      ]);
    });

    it('sets the overview title', () => {
      renderHook(() => useBreadcrumbs([]), { wrapper: Wrapper });

      expect(setTitle).toHaveBeenCalledWith(['Observability']);
    });
  });

  describe('given breadcrumbs', () => {
    it('sets the breadcrumbs', () => {
      renderHook(
        () =>
          useBreadcrumbs([
            { text: 'One', href: '/one' },
            {
              text: 'Two',
            },
          ]),
        { wrapper: Wrapper }
      );

      expect(setBreadcrumbs).toHaveBeenCalledWith([
        { href: '/overview', onClick: expect.any(Function), text: 'Observability' },
        {
          href: '/one',
          onClick: expect.any(Function),
          text: 'One',
        },
        {
          text: 'Two',
        },
      ]);
    });

    it('sets the title', () => {
      renderHook(
        () =>
          useBreadcrumbs([
            { text: 'One', href: '/one' },
            {
              text: 'Two',
            },
          ]),
        { wrapper: Wrapper }
      );

      expect(setTitle).toHaveBeenCalledWith(['Two', 'One', 'Observability']);
    });
  });
});
