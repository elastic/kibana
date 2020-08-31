/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import { MockApmPluginContextWrapper } from '../../../../../context/ApmPluginContext/MockApmPluginContext';
import { MockUrlParamsContextProvider } from '../../../../../context/UrlParamsContext/MockUrlParamsContextProvider';
import { mockMoment, toJson } from '../../../../../utils/testHelpers';
import { ErrorGroupList } from '../index';
import props from './props.json';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => {
  return {
    htmlIdGenerator: () => () => `generated-id`,
  };
});

describe('ErrorGroupOverview -> List', () => {
  beforeAll(() => {
    mockMoment();
  });

  it('should render empty state', () => {
    const storeState = {};
    const wrapper = mount(
      <MockUrlParamsContextProvider>
        <ErrorGroupList items={[]} />
      </MockUrlParamsContextProvider>,
      storeState
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  it('should render with data', () => {
    const wrapper = mount(
      <MockApmPluginContextWrapper>
        <MockUrlParamsContextProvider>
          <ErrorGroupList items={props.items} />
        </MockUrlParamsContextProvider>
      </MockApmPluginContextWrapper>
    );

    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
