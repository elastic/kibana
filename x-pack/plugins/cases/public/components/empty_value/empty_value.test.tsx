/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount, shallow } from 'enzyme';
import React from 'react';
import { ThemeProvider } from 'styled-components';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import {
  defaultToEmptyTag,
  getEmptyString,
  getEmptyStringTag,
  getEmptyTagValue,
  getEmptyValue,
  getOrEmptyTag,
} from '.';
import { getMockTheme } from '../../common/lib/kibana/kibana_react.mock';

describe('EmptyValue', () => {
  const mockTheme = getMockTheme({ eui: { euiColorMediumShade: '#ece' } });

  test('it renders against snapshot', () => {
    const wrapper = shallow(<p>{getEmptyString()}</p>);
    expect(wrapper).toMatchSnapshot();
  });

  describe('#getEmptyValue', () => {
    test('should return an empty value', () => expect(getEmptyValue()).toBe('—'));
  });

  describe('#getEmptyString', () => {
    test('should turn into an empty string place holder', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={mockTheme}>
          <p>{getEmptyString()}</p>
        </ThemeProvider>
      );
      expect(wrapper.text()).toBe('(Empty String)');
    });
  });

  describe('#getEmptyTagValue', () => {
    const wrapper = mount(
      <ThemeProvider theme={mockTheme}>
        <p>{getEmptyTagValue()}</p>
      </ThemeProvider>
    );
    test('should return an empty tag value', () => expect(wrapper.text()).toBe('—'));
  });

  describe('#getEmptyStringTag', () => {
    test('should turn into an span that has length of 1', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={mockTheme}>
          <p>{getEmptyStringTag()}</p>
        </ThemeProvider>
      );
      expect(wrapper.find('span')).toHaveLength(1);
    });

    test('should turn into an empty string tag place holder', () => {
      const wrapper = mountWithIntl(
        <ThemeProvider theme={mockTheme}>
          <p>{getEmptyStringTag()}</p>
        </ThemeProvider>
      );
      expect(wrapper.text()).toBe(getEmptyString());
    });
  });

  describe('#defaultToEmptyTag', () => {
    test('should default to an empty value when a value is null', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <p>{defaultToEmptyTag(null)}</p>
        </ThemeProvider>
      );
      expect(wrapper.text()).toBe(getEmptyValue());
    });

    test('should default to an empty value when a value is undefined', () => {
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <p>{defaultToEmptyTag(undefined)}</p>
        </ThemeProvider>
      );
      expect(wrapper.text()).toBe(getEmptyValue());
    });

    test('should return a deep path value', () => {
      const test = {
        a: {
          b: {
            c: 1,
          },
        },
      };
      const wrapper = mount(<p>{defaultToEmptyTag(test.a.b.c)}</p>);
      expect(wrapper.text()).toBe('1');
    });
  });

  describe('#getOrEmptyTag', () => {
    test('should default empty value when a deep rooted value is null', () => {
      const test = {
        a: {
          b: {
            c: null,
          },
        },
      };
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <p>{getOrEmptyTag('a.b.c', test)}</p>
        </ThemeProvider>
      );
      expect(wrapper.text()).toBe(getEmptyValue());
    });

    test('should default empty value when a deep rooted value is undefined', () => {
      const test = {
        a: {
          b: {
            c: undefined,
          },
        },
      };
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <p>{getOrEmptyTag('a.b.c', test)}</p>
        </ThemeProvider>
      );
      expect(wrapper.text()).toBe(getEmptyValue());
    });

    test('should default empty value when a deep rooted value is missing', () => {
      const test = {
        a: {
          b: {},
        },
      };
      const wrapper = mount(
        <ThemeProvider theme={mockTheme}>
          <p>{getOrEmptyTag('a.b.c', test)}</p>
        </ThemeProvider>
      );
      expect(wrapper.text()).toBe(getEmptyValue());
    });

    test('should return a deep path value', () => {
      const test = {
        a: {
          b: {
            c: 1,
          },
        },
      };
      const wrapper = mount(<p>{getOrEmptyTag('a.b.c', test)}</p>);
      expect(wrapper.text()).toBe('1');
    });
  });
});
