/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from 'test_utils/enzyme_helpers';
import { EmptyState } from '../empty_state';

describe('EmptyState component', () => {
  it('renders child components when count is truthy', () => {
    const component = shallowWithIntl(
      <EmptyState basePath="" count={1}>
        <div>Foo</div>
        <div>Bar</div>
        <div>Baz</div>
      </EmptyState>
    );
    expect(component).toMatchSnapshot();
  });
  it(`doesn't render child components when count is falsey`, () => {
    const component = mountWithIntl(
      <EmptyState basePath="">
        <div>Shouldn't be rendered</div>
      </EmptyState>
    );
    expect(component).toMatchSnapshot();
  });
  it(`renders the message when an error occurs`, () => {
    const component = mountWithIntl(
      <EmptyState basePath="" error={'An error occurred'} count={1}>
        <div>Shouldn't appear...</div>
      </EmptyState>
    );
    expect(component).toMatchSnapshot();
  });
  it('renders children while loading', () => {
    const component = mountWithIntl(
      <EmptyState basePath="" count={1} loading={true}>
        <div>Should appear even while loading...</div>
      </EmptyState>
    );
    expect(component).toMatchSnapshot();
  });
});
