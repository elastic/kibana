/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow } from 'enzyme';

import { EuiAccordion, EuiTableRow, EuiTableHeaderCell } from '@elastic/eui';

import { EuiLinkTo } from '../../react_router_helpers';

import { SchemaType } from '../types';

import { SchemaErrorsAccordion } from './';

describe('SchemaErrorsAccordion', () => {
  const props = {
    fieldCoercionErrors: {
      id: [
        {
          id: 'foo',
          error: 'this is an error',
        },
        {
          id: 'bar',
          error: 'this is another error',
        },
      ],
    },
    schema: {
      id: SchemaType.Text,
    },
  };

  it('renders', () => {
    const wrapper = shallow(<SchemaErrorsAccordion {...props} />);

    expect(wrapper.find(EuiAccordion)).toHaveLength(1);
    expect(wrapper.find(EuiTableRow)).toHaveLength(2);
  });

  it('conditionally renders a view column', () => {
    const generateViewPath = jest.fn((id: string) => `/documents/${id}`);
    const wrapper = shallow(
      <SchemaErrorsAccordion {...props} generateViewPath={generateViewPath} />
    );

    expect(wrapper.find(EuiTableHeaderCell)).toHaveLength(3);
    expect(wrapper.find(EuiLinkTo)).toHaveLength(2);
    expect(wrapper.find(EuiLinkTo).first().prop('to')).toEqual('/documents/foo');
  });
});
