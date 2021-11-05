/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EntSearchLogStream } from '../../../../shared/log_stream';

import { AutomatedCurationHistory } from './automated_curation_history';

describe('AutomatedCurationHistory', () => {
  it('renders', () => {
    const wrapper = shallow(<AutomatedCurationHistory engineName="foo" query="some text" />);
    expect(wrapper.find(EntSearchLogStream).prop('query')).toEqual(
      'appsearch.adaptive_relevance.query: some text and event.kind: event and event.dataset: search-relevance-suggestions and appsearch.adaptive_relevance.engine: foo and event.action: curation_suggestion and appsearch.adaptive_relevance.suggestion.new_status: automated'
    );
  });
});
