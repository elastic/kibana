/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues, setMockActions } from '../../../__mocks__/kea_logic';

import React from 'react';

import { shallow } from 'enzyme';

import { UNIVERSAL_LANGUAGE_VALUE } from './constants';
import {
  NewSearchIndexTemplate,
  Props as NewSearchIndexTemplateProps,
} from './new_search_index_template';

describe('NewSearchIndexTemplate', () => {
  const mockProps: NewSearchIndexTemplateProps = {
    onSubmit: jest.fn(),
    type: 'api',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setMockValues({
      language: null,
      languageSelectValue: UNIVERSAL_LANGUAGE_VALUE,
      name: 'my-name',
      rawName: 'MY$_RAW_$NAME',
    });
    setMockActions({
      makeRequest: jest.fn(),
      setHasPrefix: jest.fn(),
      setLanguageSelectValue: jest.fn(),
    });
  });

  it('renders', () => {
    const wrapper = shallow(<NewSearchIndexTemplate {...mockProps} />);

    expect(wrapper.find('EuiForm')).toHaveLength(1);
  });
});
