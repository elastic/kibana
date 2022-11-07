/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Switch, MemoryRouter } from 'react-router-dom';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { PrivilegedRoute } from './privileged_route';
import type { PrivilegedRouteProps } from './privileged_route';

describe('PrivilegedRoute', () => {
  const componentTestId = 'component-to-render';

  let renderProps: PrivilegedRouteProps;
  let renderResult: ReturnType<AppContextTestRender['render']>;
  let render: () => void;

  beforeEach(() => {
    renderProps = {
      component: () => <div data-test-subj={componentTestId} />,
      path: 'path',
      privilege: true,
    };

    const renderer = createAppRootMockRenderer();

    render = () => {
      renderResult = renderer.render(
        <MemoryRouter initialEntries={['path']}>
          <Switch>
            <PrivilegedRoute {...renderProps} />
          </Switch>
        </MemoryRouter>
      );
    };
  });

  it('renders component if it has privileges and on correct path', async () => {
    render();

    expect(renderResult.getByTestId(componentTestId)).toBeTruthy();
    expect(renderResult.queryByText(/superuser/)).toBeNull();
  });

  it('renders NoPermission if does not have privileges', async () => {
    renderProps.privilege = false;

    render();

    expect(renderResult.getByText(/superuser/)).toBeTruthy();
    expect(renderResult.queryByTestId(componentTestId)).toBeNull();
  });

  it('renders nothing if path is different', async () => {
    renderProps.path = 'different';

    render();

    expect(renderResult.queryByTestId(componentTestId)).toBeNull();
    expect(renderResult.queryByText(/superuser/)).toBeNull();
  });
});
