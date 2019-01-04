/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mockAnnotations from '../../../components/annotations_table/__mocks__/mock_annotations.json';

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

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

    const wrapper = shallowWithIntl(<AnnotationFlyout {...props} />);
    expect(wrapper).toMatchSnapshot();
  });
});
