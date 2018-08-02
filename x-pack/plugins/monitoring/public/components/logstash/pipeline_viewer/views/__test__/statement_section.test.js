/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { StatementSection } from '../statement_section';
import { shallow } from 'enzyme';

describe('StatementSection component', () => {
  let props;
  let onShowVertexDetails;

  beforeEach(() => {
    onShowVertexDetails = jest.fn();
    props = {
      elements: [
        {
          id: 'standardInput',
          parentId: null,
        },
        {
          id: 'fileInput',
          parentId: null,
        },
      ],
      headingText: 'Inputs',
      iconType: 'logstashInput',
      onShowVertexDetails,
    };
  });

  it('renders heading text, correct icon type, and elements for StatementSection', () => {
    expect(shallow(<StatementSection {...props} />)).toMatchSnapshot();
  });

  it('renders nothing if elements array is empty', () => {
    props.elements = [];
    const wrapper = shallow(<StatementSection {...props} />);
    expect(wrapper.instance()).toBe(null);
  });
});
