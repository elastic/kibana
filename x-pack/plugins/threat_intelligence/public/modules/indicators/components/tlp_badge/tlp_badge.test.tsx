/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EMPTY_VALUE } from '../../../../common/constants';
import { TLPBadge } from './tlp_badge';

describe('TLPBadge', () => {
  it(`should return ${EMPTY_VALUE} if color doesn't exist`, () => {
    const invalidValue = 'abc';
    const { asFragment } = render(<TLPBadge value={invalidValue} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should handle value in various casing with extra spaces', () => {
    const value = ' RED ';
    const { asFragment } = render(<TLPBadge value={value} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('should handle proper value', () => {
    const value = 'green';
    const { asFragment } = render(<TLPBadge value={value} />);
    expect(asFragment()).toMatchSnapshot();
  });
});
