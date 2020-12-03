/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { EuiAccordion, EuiTableRow } from '@elastic/eui';

import { EuiLinkTo } from '../react_router_helpers';
import { SchemaErrorsAccordion } from './schema_errors_accordion';

describe('SchemaErrorsAccordion', () => {
  const props = {
    fieldCoercionErrors: {
      id: [
        {
          external_id: 'foo',
          error: 'this is an error',
        },
        {
          external_id: 'bar',
          error: 'this is another error',
        },
      ],
    },
    schema: {
      id: 'string',
      name: 'boolean',
    },
  };

  it('renders', () => {
    const wrapper = shallow(<SchemaErrorsAccordion {...props} />);

    expect(wrapper.find(EuiAccordion)).toHaveLength(1);
    expect(wrapper.find(EuiTableRow)).toHaveLength(2);
    expect(wrapper.find(EuiLinkTo)).toHaveLength(0);
  });

  it('renders document buttons', () => {
    const wrapper = shallow(<SchemaErrorsAccordion {...props} itemId="123" getRoute={jest.fn()} />);

    expect(wrapper.find(EuiLinkTo)).toHaveLength(2);
  });
});
