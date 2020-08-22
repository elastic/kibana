/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
import { ExportApp } from '../export_app.component';
import { RouterContext } from '../../../../components/router';
import { CanvasWorkpad } from '../../../../../types';

jest.mock('style-it', () => ({
  it: (css: string, Component: any) => Component,
}));

jest.mock('../../../../components/workpad_page', () => ({
  WorkpadPage: (props: any) => <div>Page</div>,
}));

describe('<ExportApp />', () => {
  test('renders as expected', () => {
    const sampleWorkpad = ({
      id: 'my-workpad-abcd',
      css: '',
      pages: [
        {
          elements: [0, 1, 2],
        },
        {
          elements: [3, 4, 5, 6],
        },
      ],
    } as any) as CanvasWorkpad;

    const page1 = mount(
      <RouterContext.Provider value={{ navigateTo: () => {} }}>
        <ExportApp workpad={sampleWorkpad} selectedPageIndex={0} initializeWorkpad={() => {}} />
      </RouterContext.Provider>
    );
    expect(page1).toMatchSnapshot();

    const page2 = mount(
      <RouterContext.Provider value={{ navigateTo: () => {} }}>
        <ExportApp workpad={sampleWorkpad} selectedPageIndex={1} initializeWorkpad={() => {}} />
      </RouterContext.Provider>
    );
    expect(page2).toMatchSnapshot();
  });
});
