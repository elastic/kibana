/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep } from 'lodash';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { mockBrowserFields } from '../../../../containers/source/mock';
import { Ecs } from '../../../../graphql/types';
import { mockTimelineData } from '../../../../mock';
import { plainRowRenderer } from './plain_row_renderer';

describe('plain_row_renderer', () => {
  let mockDatum: Ecs;
  beforeEach(() => {
    mockDatum = cloneDeep(mockTimelineData[0].ecs);
  });

  test('renders correctly against snapshot', () => {
    const children = plainRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: mockDatum,
      width: 100,
      children: <span>{'some children'}</span>,
    });
    const wrapper = shallow(<span>{children}</span>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('should always return isInstance true', () => {
    expect(plainRowRenderer.isInstance(mockDatum)).toBe(true);
  });

  test('should render a plain row', () => {
    const children = plainRowRenderer.renderRow({
      browserFields: mockBrowserFields,
      data: mockDatum,
      width: 100,
      children: <span>{'some children'}</span>,
    });
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <span>{children}</span>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('some children');
  });
});
