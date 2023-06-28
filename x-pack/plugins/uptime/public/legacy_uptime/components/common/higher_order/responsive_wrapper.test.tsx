/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../lib/helper/rtl_helpers';
import { withResponsiveWrapper } from './responsive_wrapper';

interface Prop {
  isResponsive: boolean;
}

describe('ResponsiveWrapper HOC', () => {
  let WrappedByHOC: React.FC<Prop>;
  beforeEach(() => {
    WrappedByHOC = withResponsiveWrapper<Prop>(() => <div>Should be responsive</div>);
  });

  it('renders a responsive wrapper', () => {
    const { getByTestId } = render(<WrappedByHOC isResponsive={true} />);
    expect(getByTestId('uptimeWithResponsiveWrapper--wrapper')).toBeInTheDocument();
  });

  it('is not responsive when prop is false', () => {
    const { getByTestId } = render(<WrappedByHOC isResponsive={false} />);
    expect(getByTestId('uptimeWithResponsiveWrapper--panel')).toBeInTheDocument();
  });
});
