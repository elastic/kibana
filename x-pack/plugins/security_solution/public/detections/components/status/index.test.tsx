/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mount } from 'enzyme';
import React from 'react';

import { Status } from '.';

interface Expected {
  badgeColor: string;
  iconType: 'check' | 'alert';
  status: 'active' | 'recovered' | 'any-other-status';
}

describe('Status', () => {
  const expected: Expected[] = [
    {
      badgeColor: 'danger',
      iconType: 'alert',
      status: 'active',
    },
    {
      badgeColor: 'hollow',
      iconType: 'check',
      status: 'recovered',
    },
    {
      badgeColor: 'danger',
      iconType: 'alert',
      status: 'any-other-status',
    },
  ];

  expected.forEach(({ status, badgeColor, iconType }) => {
    test(`it renders the expected badge color when status is ${status}`, () => {
      const wrapper = mount(<Status status={status} />);

      expect(wrapper.find('[data-test-subj="status-icon"]').first().props().color).toEqual(
        badgeColor
      );
    });

    test(`it renders the expected icon type when status is ${status}`, () => {
      const wrapper = mount(<Status status={status} />);

      expect(wrapper.find('[data-test-subj="status-icon"]').first().props().type).toEqual(iconType);
    });
  });
});
