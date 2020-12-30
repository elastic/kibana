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
});
