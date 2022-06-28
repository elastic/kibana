/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { matchers } from '@emotion/jest';
import React from 'react';

import { TruncatableText } from '.';

expect.extend(matchers);

describe('TruncatableText', () => {
  test('it adds the hidden overflow style', () => {
    const wrapper = render(<TruncatableText>{'content text'}</TruncatableText>);

    expect(wrapper.getByText('content text')).toHaveStyleRule('overflow', 'hidden');
  });

  test('it adds the ellipsis text-overflow style', () => {
    const wrapper = render(<TruncatableText>{'content text'}</TruncatableText>);

    expect(wrapper.getByText('content text')).toHaveStyleRule('text-overflow', 'ellipsis');
  });

  test('it adds the nowrap white-space style', () => {
    const wrapper = render(<TruncatableText>{'content text'}</TruncatableText>);

    expect(wrapper.getByText('content text')).toHaveStyleRule('white-space', 'nowrap');
  });
});
