/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../test';
import { ContainerNameRow } from './container_name_row';
import { fireEvent } from '@testing-library/react';

const TEST_NAME = 'TEST ROW';
const TEST_BUTTON_FILTER = <div>Filter In</div>;
const TEST_BUTTON_FILTER_OUT = <div>Filter Out</div>;
const TEST_BUTTON_COPY = <div>Copy</div>;

describe('ContainerNameRow component with valid row', () => {
  let renderResult: ReturnType<typeof render>;
  const mockedContext = createAppRootMockRenderer();
  const render: () => ReturnType<AppContextTestRender['render']> = () =>
    (renderResult = mockedContext.render(
      <ContainerNameRow
        name={TEST_NAME}
        filterButtonIn={TEST_BUTTON_FILTER}
        filterButtonOut={TEST_BUTTON_FILTER_OUT}
        copyToClipboardButton={TEST_BUTTON_COPY}
      />
    ));

  it('should show the row element as well as the pop up filter button when mouse hovers above it', async () => {
    render();
    expect(renderResult.getByText(TEST_NAME)).toBeVisible();
    fireEvent.mouseOver(renderResult.queryByText(TEST_NAME)!);
    expect(renderResult.getByText('Filter In')).toBeVisible();
    expect(renderResult.getByText('Filter Out')).toBeVisible();
    expect(renderResult.getByText('Copy')).toBeVisible();
  });

  it('should show the row element but not the pop up filter button outside mouse hover', async () => {
    render();
    expect(renderResult.getByText(TEST_NAME)).toBeVisible();
    expect(renderResult.queryByText('Filter In')).toBeFalsy();
    expect(renderResult.queryByText('Filter Out')).toBeFalsy();
    expect(renderResult.queryByText('Copy')).toBeFalsy();
  });
});
