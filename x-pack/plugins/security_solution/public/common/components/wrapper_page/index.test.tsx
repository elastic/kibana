/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../mock';
import { WrapperPage } from './index';

describe('WrapperPage', () => {
  test('it renders', () => {
    const wrapper = shallow(
      <TestProviders>
        <WrapperPage>
          <p>{'Test page'}</p>
        </WrapperPage>
      </TestProviders>
    );

    expect(wrapper.find('Memo(WrapperPageComponent)')).toMatchSnapshot();
  });

  describe('restrict width', () => {
    test('default max width when restrictWidth is true', () => {
      const wrapper = shallow(
        <TestProviders>
          <WrapperPage restrictWidth>
            <p>{'Test page'}</p>
          </WrapperPage>
        </TestProviders>
      );

      expect(wrapper.find('Memo(WrapperPageComponent)')).toMatchSnapshot();
    });

    test('custom max width when restrictWidth is number', () => {
      const wrapper = shallow(
        <TestProviders>
          <WrapperPage restrictWidth={600}>
            <p>{'Test page'}</p>
          </WrapperPage>
        </TestProviders>
      );

      expect(wrapper.find('Memo(WrapperPageComponent)')).toMatchSnapshot();
    });

    test('custom max width when restrictWidth is string', () => {
      const wrapper = shallow(
        <TestProviders>
          <WrapperPage restrictWidth="600px">
            <p>{'Test page'}</p>
          </WrapperPage>
        </TestProviders>
      );

      expect(wrapper.find('Memo(WrapperPageComponent)')).toMatchSnapshot();
    });
  });
});
