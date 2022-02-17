/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { Severity } from '.';

interface Expected {
  color: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | 'any-other-severity';
  textColor: string;
}

describe('Severity', () => {
  const expected: Expected[] = [
    {
      color: '#C5CFD8',
      severity: 'low',
      textColor: 'default',
    },
    {
      color: '#EFC44C',
      severity: 'medium',
      textColor: 'default',
    },
    {
      color: '#FF7E62',
      severity: 'high',
      textColor: 'ghost',
    },
    {
      color: '#C3505E',
      severity: 'critical',
      textColor: 'ghost',
    },
    {
      color: 'hollow',
      severity: 'any-other-severity',
      textColor: 'default',
    },
  ];

  test('it capitalizes the provided `severity`', () => {
    const wrapper = mount(<Severity severity={'critical'} />);

    expect(wrapper.find('[data-test-subj="severity-badge"]').first()).toHaveStyleRule(
      'text-transform',
      'capitalize'
    );
  });

  test('it renders the provided `severity`', () => {
    const wrapper = mount(<Severity severity={'critical'} />);

    expect(wrapper.text()).toBe('critical');
  });

  expected.forEach(({ severity, color, textColor }) => {
    test(`it renders the expected badge color when severity is ${severity}`, () => {
      const wrapper = mount(<Severity severity={severity} />);

      expect(wrapper.find('[data-test-subj="severity-badge"]').first().props().color).toEqual(
        color
      );
    });

    test(`it renders the expected text color when severity is ${severity}`, () => {
      const wrapper = mount(<Severity severity={severity} />);

      expect(wrapper.find('[data-test-subj="severity-text"]').first().props().color).toEqual(
        textColor
      );
    });
  });
});
