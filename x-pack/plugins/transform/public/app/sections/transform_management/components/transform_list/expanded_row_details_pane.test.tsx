/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { ExpandedRowDetailsPane, Section, SectionConfig } from './expanded_row_details_pane';

const section: SectionConfig = {
  title: 'the-section-title',
  position: 'left',
  items: [
    {
      title: 'the-item-title',
      description: 'the-item-description',
    },
  ],
};

describe('Transform: Job List Expanded Row <ExpandedRowDetailsPane />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(<ExpandedRowDetailsPane sections={[section]} />);

    expect(wrapper).toMatchSnapshot();
  });
});

describe('Transform: Job List Expanded Row <Section />', () => {
  test('Minimal initialization', () => {
    const wrapper = shallow(<Section section={section} />);

    expect(wrapper).toMatchSnapshot();
  });
});
