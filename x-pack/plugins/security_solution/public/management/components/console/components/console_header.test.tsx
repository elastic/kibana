/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ConsoleProps } from '..';
import type { AppContextTestRender } from '../../../../common/mock/endpoint';
import { getConsoleTestSetup } from '../mocks';
import { HELP_LABEL } from './console_header';

describe('Console header area', () => {
  let render: (props?: Partial<ConsoleProps>) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;

  beforeEach(() => {
    const testSetup = getConsoleTestSetup();

    render = (props = {}) => (renderResult = testSetup.renderConsole(props));
  });

  it('should display the help button', async () => {
    render();

    expect(renderResult.getByTestId('test-header-helpButton').textContent).toEqual(HELP_LABEL);
  });

  it('should not display a title component', async () => {
    render();

    expect(renderResult.getByTestId('test-header-titleComponentContainer').textContent).toEqual('');
  });

  it('should show a title component if one was provided', async () => {
    render({ TitleComponent: () => <>{'header component here'}</> });

    expect(renderResult.getByTestId('test-header-titleComponentContainer').textContent).toEqual(
      'header component here'
    );
  });

  it('should open the side panel when help button is clicked', async () => {
    render();
    renderResult.getByTestId('test-header-helpButton').click();

    expect(renderResult.getByTestId('test-sidePanel')).toBeTruthy();
  });

  it('should close the side panel when close button is clicked', async () => {
    render();
    renderResult.getByTestId('test-header-helpButton').click();

    expect(renderResult.getByTestId('test-sidePanel')).toBeTruthy();

    renderResult.getByTestId('test-sidePanel-headerCloseButton').click();

    expect(renderResult.queryByTestId('test-sidePanel')).toBeNull();
  });
});
