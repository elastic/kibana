/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { mount } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';

import { cloneDeep } from 'lodash';
import { plainRowRenderer } from '.';
import { Ecs } from '../../../../graphql/types';
import { mockEcsData } from '../../../../mock';

describe('plain_row_renderer', () => {
  let mockDatum: Ecs;
  beforeEach(() => {
    mockDatum = cloneDeep(mockEcsData[0]);
  });

  test('should always return isInstance true', () => {
    expect(plainRowRenderer.isInstance(mockDatum)).toBe(true);
  });

  test('should render a plain row', () => {
    const children = plainRowRenderer.renderRow(mockDatum, <span>some children</span>);
    const wrapper = mount(
      <ThemeProvider theme={() => ({ eui: euiDarkVars, darkMode: true })}>
        <span>{children}</span>
      </ThemeProvider>
    );
    expect(wrapper.text()).toEqual('some children');
  });
});
