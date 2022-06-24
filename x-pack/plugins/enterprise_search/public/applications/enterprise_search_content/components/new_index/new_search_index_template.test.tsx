/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import {
  NewSearchIndexTemplate,
  Props as NewSearchIndexTemplateProps,
} from './new_search_index_template';

describe('NewSearchIndexTemplate', () => {
  const mockProps: NewSearchIndexTemplateProps = {
    title: 'Index using the API',
    description: 'Provide a name and optionally select a language analyzer.',
    docsUrl: 'http://www.elastic.co/guide',
    onSubmit: jest.fn(),
    type: 'api',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({ name: 'my-name', rawName: 'MY$_RAW_$NAME', language: 'Universal' });
    setMockActions({ makeRequest: jest.fn() });
  });

  it('renders children', () => {
    const wrapper = shallow(
      <NewSearchIndexTemplate {...mockProps}>
        <div data-test-subj="ChildComponent" />
      </NewSearchIndexTemplate>
    );

    expect(wrapper.find('[data-test-subj="ChildComponent"]')).toHaveLength(1);
  });
});
