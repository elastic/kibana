/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../../__mocks__/enterprise_search_url.mock';
import { setMockValues } from '../../../../__mocks__/kea.mock';

import React from 'react';
import { shallow, ShallowWrapper } from 'enzyme';
import { EuiCode, EuiCodeBlock } from '@elastic/eui';

import { ApiCodeExample } from './';

describe('ApiCodeExample', () => {
  let wrapper: ShallowWrapper;

  beforeAll(() => {
    setMockValues({ engineName: 'test-engine', engine: { apiKey: 'test-key' } });
    wrapper = shallow(<ApiCodeExample />);
  });

  it('renders', () => {
    expect(wrapper.find('h3').text()).toEqual('Indexing by API');
    expect(wrapper.find(EuiCodeBlock)).toHaveLength(1);
  });

  it('renders with the full remote Enterprise Search API URL', () => {
    expect(wrapper.find(EuiCode).dive().dive().text()).toEqual(
      'http://localhost:3002/api/as/v1/engines/test-engine/documents'
    );
    expect(wrapper.find(EuiCodeBlock).dive().dive().text()).toEqual(
      expect.stringContaining('http://localhost:3002/api/as/v1/engines/test-engine/documents')
    );
  });

  it('renders with the API key', () => {
    expect(wrapper.find(EuiCodeBlock).dive().dive().text()).toEqual(
      expect.stringContaining('test-key')
    );
  });
});
