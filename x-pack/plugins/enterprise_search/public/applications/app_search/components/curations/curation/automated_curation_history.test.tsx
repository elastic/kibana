/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiButtonEmpty } from '@elastic/eui';

import { nextTick } from '@kbn/test-jest-helpers';

import { EntSearchLogStream } from '../../../../shared/log_stream';

import { DataPanel } from '../../data_panel';

import { AutomatedCurationHistory } from './automated_curation_history';

describe('AutomatedCurationHistory', () => {
  it('renders', () => {
    const wrapper = shallow(<AutomatedCurationHistory engineName="foo" query="some text" />);
    expect(wrapper.find(EntSearchLogStream).prop('query')).toEqual(
      'appsearch.adaptive_relevance.query: some text and event.kind: event and event.dataset: search-relevance-suggestions and appsearch.adaptive_relevance.engine: foo and event.action: curation_suggestion and appsearch.adaptive_relevance.suggestion.new_status: automated'
    );
  });

  it('sets new endTimestamp when refresh is pressed', async () => {
    const wrapper = shallow(<AutomatedCurationHistory engineName="foo" query="some text" />);
    const initialTimestamp = wrapper.find(EntSearchLogStream).prop('endTimestamp');
    await nextTick();

    // Find the refresh button and click
    shallow(wrapper.find(DataPanel).prop('title')).find(EuiButtonEmpty).simulate('click');

    wrapper.update();

    expect(wrapper.find(EntSearchLogStream).prop('endTimestamp')).not.toEqual(initialTimestamp);
  });
});
