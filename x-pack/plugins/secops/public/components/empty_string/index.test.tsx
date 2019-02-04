/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { getEmptyString, getEmptyStringTag, getOrEmptyStringTag } from '.';

describe('empty_string', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });

  describe('#getEmptyString', () => {
    test('should turn into an empty string place holder', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{getEmptyString()}</p>
        </ThemeProvider>
      );
      expect(wrapper.text()).toBe('(Empty String)');
    });
  });

  describe('#getEmptyStringTag', () => {
    test('should turn into an span that has length of 1', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{getEmptyStringTag()}</p>
        </ThemeProvider>
      );
      expect(wrapper.find('span')).toHaveLength(1);
    });

    test('should turn into an empty string tag place holder', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{getEmptyStringTag()}</p>
        </ThemeProvider>
      );
      expect(wrapper.text()).toBe(getEmptyString());
    });
  });

  describe('#getOrEmptyStringTag', () => {
    test('should turn into an empty string place holder given an empty string', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{getOrEmptyStringTag('')}</p>
        </ThemeProvider>
      );
      expect(wrapper.text()).toBe('(Empty String)');
    });

    test('should return a non empty string text', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={theme}>
          <p>{getOrEmptyStringTag('Hello World')}</p>
        </ThemeProvider>
      );
      expect(wrapper.text()).toBe('Hello World');
    });
  });
});
