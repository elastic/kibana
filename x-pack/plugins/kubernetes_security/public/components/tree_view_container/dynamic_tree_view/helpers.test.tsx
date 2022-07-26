/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { FC } from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { focusNextElement } from './helpers';

// dummy component for testing
const TestButtonList: FC<any> = (props: any) => (
  <>
    {[...Array(100)].map((_, idx) => (
      <button key={idx} {...props}>
        Button {idx}
      </button>
    ))}
  </>
);

describe('DynamicTreeView component', () => {
  it('Should focus the next element', async () => {
    const onKeyDown = (e: any) => {
      focusNextElement(e, 'button', 'next');
    };
    const wrapper = render(<TestButtonList onKeyDown={onKeyDown} />);
    wrapper.getByText('Button 40').focus();

    userEvent.keyboard('{ArrowRight}');
    expect(wrapper.getByText('Button 41')).toHaveFocus();
    userEvent.keyboard('{ArrowRight}');
    expect(wrapper.getByText('Button 42')).toHaveFocus();
  });
  it('Should focus the previous element', async () => {
    const onKeyDown = (e: any) => {
      focusNextElement(e, 'button', 'prev');
    };
    const wrapper = render(<TestButtonList onKeyDown={onKeyDown} />);
    wrapper.getByText('Button 40').focus();

    userEvent.keyboard('{ArrowLeft}');
    expect(wrapper.getByText('Button 39')).toHaveFocus();
    userEvent.keyboard('{ArrowLeft}');
    expect(wrapper.getByText('Button 38')).toHaveFocus();
  });
});
