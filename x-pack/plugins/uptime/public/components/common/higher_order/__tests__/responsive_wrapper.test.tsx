/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { withResponsiveWrapper } from '../responsive_wrapper';

interface Prop {
  isResponsive: boolean;
}

describe('ResponsiveWrapper HOC', () => {
  let WrappedByHOC: React.FC<Prop>;
  beforeEach(() => {
    WrappedByHOC = withResponsiveWrapper<Prop>(() => <div>Should be responsive</div>);
  });

  it('renders a responsive wrapper', () => {
    const component = shallowWithIntl(<WrappedByHOC isResponsive={true} />);
    expect(component).toMatchSnapshot();
  });

  it('is not responsive when prop is false', () => {
    const component = shallowWithIntl(<WrappedByHOC isResponsive={false} />);
    expect(component).toMatchSnapshot();
  });
});
