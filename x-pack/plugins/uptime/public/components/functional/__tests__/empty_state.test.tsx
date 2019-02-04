/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { EmptyState } from '../empty_state';

describe('EmptyState component', () => {
  it('renders child components when count is truthy', () => {
    const component = shallowWithIntl(
      <EmptyState count={1}>
        <div>Foo</div>
        <div>Bar</div>
        <div>Baz</div>
      </EmptyState>
    );
    expect(component).toMatchSnapshot();
  });
  it(`doesn't render child components when count is falsey`, () => {
    const component = shallowWithIntl(
      <EmptyState count={undefined}>
        <div>Shouldn't be rendered</div>
      </EmptyState>
    );
    expect(component).toMatchSnapshot();
  });
});
