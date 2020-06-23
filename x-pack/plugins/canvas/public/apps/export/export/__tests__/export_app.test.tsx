/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mount } from 'enzyme';
// @ts-expect-error untyped local
import { ExportApp } from '../export_app';

jest.mock('style-it', () => ({
  it: (css: string, Component: any) => Component,
}));

jest.mock('../../../../components/workpad_page', () => ({
  WorkpadPage: (props: any) => <div>Page</div>,
}));

jest.mock('../../../../components/link', () => ({
  Link: (props: any) => <div>Link</div>,
}));

describe('<ExportApp />', () => {
  test('renders as expected', () => {
    const sampleWorkpad = {
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
    };

    const page1 = mount(
      <ExportApp workpad={sampleWorkpad} selectedPageIndex={0} initializeWorkpad={() => {}} />
    );
    expect(page1).toMatchSnapshot();

    const page2 = mount(
      <ExportApp workpad={sampleWorkpad} selectedPageIndex={1} initializeWorkpad={() => {}} />
    );
    expect(page2).toMatchSnapshot();
  });
});
