/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';
import {
  defaultToEmpty,
  defaultToEmptyTag,
  getEmptyTagValue,
  getEmptyValue,
  getOrEmpty,
  getOrEmptyTag,
} from '.';

describe('EmptyValue', () => {
  describe('#getEmptyValue', () =>
    test('should return an empty value', () => expect(getEmptyValue()).toBe('--')));

  describe('#getEmptyTagValue', () => {
    const wrapper = mount(<p>{getEmptyTagValue()}</p>);
    test('should return an empty tag value', () => expect(wrapper.text()).toBe('--'));
  });

  describe('#getOrEmpty', () => {
    test('should default empty value when a deep rooted value is null', () => {
      const test = {
        a: {
          b: {
            c: null,
          },
        },
      };
      expect(getOrEmpty('a.b.c', test)).toBe(getEmptyValue());
    });

    test('should default empty value when a deep rooted value is undefined', () => {
      const test = {
        a: {
          b: {
            c: undefined,
          },
        },
      };
      expect(getOrEmpty('a.b.c', test)).toBe(getEmptyValue());
    });

    test('should default empty value when a deep rooted value is missing', () => {
      const test = {
        a: {
          b: {},
        },
      };
      expect(getOrEmpty('a.b.c', test)).toBe(getEmptyValue());
    });

    test('should return a deep path value', () => {
      const test = {
        a: {
          b: {
            c: 1,
          },
        },
      };
      expect(getOrEmpty('a.b.c', test)).toBe(1);
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
      const wrapper = mount(<p>{getOrEmptyTag('a.b.c', test)}</p>);
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
      const wrapper = mount(<p>{getOrEmptyTag('a.b.c', test)}</p>);
      expect(wrapper.text()).toBe(getEmptyValue());
    });

    test('should default empty value when a deep rooted value is missing', () => {
      const test = {
        a: {
          b: {},
        },
      };
      const wrapper = mount(<p>{getOrEmptyTag('a.b.c', test)}</p>);
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

  describe('#defaultToEmpty', () => {
    test('should default to an empty value when a deep rooted value is null', () => {
      const test = {
        a: {
          b: {
            c: null,
          },
        },
      };
      expect(defaultToEmpty(test.a.b.c)).toBe(getEmptyValue());
    });

    test('should default to an empty value when a deep rooted value is undefined', () => {
      const test = {
        a: {
          b: {
            c: undefined,
          },
        },
      };
      expect(defaultToEmpty(test.a.b.c)).toBe(getEmptyValue());
    });

    test('should return a deep path value', () => {
      const test = {
        a: {
          b: {
            c: 1,
          },
        },
      };
      expect(defaultToEmpty(test.a.b.c)).toBe(1);
    });
  });

  describe('#defaultToEmptyTag', () => {
    test('should default to an empty value when a deep rooted value is null', () => {
      const test = {
        a: {
          b: {
            c: null,
          },
        },
      };
      const wrapper = mount(<p>{defaultToEmptyTag(test.a.b.c)}</p>);
      expect(wrapper.text()).toBe(getEmptyValue());
    });

    test('should default to an empty value when a deep rooted value is undefined', () => {
      const test = {
        a: {
          b: {
            c: undefined,
          },
        },
      };
      const wrapper = mount(<p>{defaultToEmptyTag(test.a.b.c)}</p>);
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
});
