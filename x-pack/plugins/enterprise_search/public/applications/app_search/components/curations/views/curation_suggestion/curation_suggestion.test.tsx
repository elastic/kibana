/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockUseParams } from '../../../../../__mocks__/react_router';
import '../../../../__mocks__/engine_logic.mock';

import React from 'react';

import { shallow } from 'enzyme';

import { AppSearchPageTemplate } from '../../../layout';

import { CurationSuggestion } from './curation_suggestion';

describe('CurationSuggestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ query: 'some%20query' });
  });

  it('renders', () => {
    const wrapper = shallow(<CurationSuggestion />);

    expect(wrapper.is(AppSearchPageTemplate)).toBe(true);
  });

  it('displays the decoded query in the title', () => {
    const wrapper = shallow(<CurationSuggestion />);

    expect(wrapper.prop('pageHeader').pageTitle).toEqual('"some query"');
  });

  it('displays an empty query if "" is encoded in as the qery', () => {
    mockUseParams.mockReturnValue({ query: '%22%22' });

    const wrapper = shallow(<CurationSuggestion />);

    expect(wrapper.prop('pageHeader').pageTitle).toEqual('""');
  });
});
