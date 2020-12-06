/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../__mocks__/enterprise_search_url.mock';
import { setMockValues } from '../../../__mocks__/kea.mock';

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { EuiButton } from '@elastic/eui';

import { CURRENT_MAJOR_VERSION } from '../../../../../common/version';

import { EmptyEngineOverview } from './engine_overview_empty';

describe('EmptyEngineOverview', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    jest.clearAllMocks();
    setMockValues({
      engineName: 'empty-engine',
    });
    wrapper = shallow(<EmptyEngineOverview />);
  });

  it('renders', () => {
    expect(wrapper.find('h1').text()).toEqual('Engine setup');
    expect(wrapper.find('h2').text()).toEqual('Setting up the “empty-engine” engine');
    expect(wrapper.find('h3').text()).toEqual('Indexing by API');
  });

  it('renders correctly versioned documentation URLs', () => {
    expect(wrapper.find(EuiButton).prop('href')).toEqual(
      `https://www.elastic.co/guide/en/app-search/${CURRENT_MAJOR_VERSION}/index.html`
    );
  });
});
