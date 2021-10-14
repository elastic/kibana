/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EntSearchLogStream } from '../../../../shared/log_stream';

import { History } from './history';

describe('History', () => {
  it('renders', () => {
    const wrapper = shallow(<History engineName="foo" query="some text" />);
    expect(wrapper.find(EntSearchLogStream).prop('query')).toEqual(
      'appsearch.search_relevance_suggestions.query: some text and event.kind: event and event.dataset: search-relevance-suggestions and appsearch.search_relevance_suggestions.engine : foo'
    );
  });
});
