/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockAnnotations from '../../../components/annotations_table/__mocks__/mock_annotations.json';

import { shallow } from 'enzyme';
import React from 'react';

import { AnnotationFlyout } from './index';

describe('AnnotationFlyout', () => {
  test('Initialization.', () => {
    const props = {
      annotation: mockAnnotations[0],
      cancelAction: jest.fn(),
      controlFunc: jest.fn(),
      deleteAction: jest.fn(),
      saveAction: jest.fn(),
    };

    const wrapper = shallow(<AnnotationFlyout {...props} />);
    expect(wrapper).toMatchSnapshot();
  });
});
