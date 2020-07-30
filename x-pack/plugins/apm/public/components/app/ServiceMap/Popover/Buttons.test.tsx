/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Buttons } from './Buttons';
import { render } from '@testing-library/react';

describe('Popover Buttons', () => {
  it('renders', () => {
    expect(() =>
      render(<Buttons selectedNodeServiceName="test service name" />)
    ).not.toThrowError();
  });

  it('handles focus click', async () => {
    const onFocusClick = jest.fn();
    const result = render(
      <Buttons
        onFocusClick={onFocusClick}
        selectedNodeServiceName="test service name"
      />
    );
    const focusButton = await result.findByText('Focus map');

    focusButton.click();

    expect(onFocusClick).toHaveBeenCalledTimes(1);
  });
});
