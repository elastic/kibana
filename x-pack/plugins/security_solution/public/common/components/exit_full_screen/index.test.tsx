/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { TestProviders } from '../../mock/test_providers';
import * as i18n from './translations';
import { ExitFullScreen, EXIT_FULL_SCREEN_CLASS_NAME } from '.';

describe('ExitFullScreen', () => {
  test('it returns null when fullScreen is false', () => {
    const exitFullScreen = mount(
      <TestProviders>
        <ExitFullScreen fullScreen={false} setFullScreen={jest.fn()} />
      </TestProviders>
    );

    expect(exitFullScreen.find('[data-test-subj="exit-full-screen"]').exists()).toBe(false);
  });

  test('it renders a button with the exported EXIT_FULL_SCREEN_CLASS_NAME class when fullScreen is true', () => {
    const exitFullScreen = mount(
      <TestProviders>
        <ExitFullScreen fullScreen={true} setFullScreen={jest.fn()} />
      </TestProviders>
    );

    expect(exitFullScreen.find(`button.${EXIT_FULL_SCREEN_CLASS_NAME}`).exists()).toBe(true);
  });

  test('it renders the expected button text when fullScreen is true', () => {
    const exitFullScreen = mount(
      <TestProviders>
        <ExitFullScreen fullScreen={true} setFullScreen={jest.fn()} />
      </TestProviders>
    );

    expect(exitFullScreen.find('[data-test-subj="exit-full-screen"]').first().text()).toBe(
      i18n.EXIT_FULL_SCREEN
    );
  });

  test('it invokes setFullScreen with a value of false when the button is clicked', () => {
    const setFullScreen = jest.fn();

    const exitFullScreen = mount(
      <TestProviders>
        <ExitFullScreen fullScreen={true} setFullScreen={setFullScreen} />
      </TestProviders>
    );

    exitFullScreen.find('button[data-test-subj="exit-full-screen"]').first().simulate('click');
    expect(setFullScreen).toBeCalledWith(false);
  });
});
