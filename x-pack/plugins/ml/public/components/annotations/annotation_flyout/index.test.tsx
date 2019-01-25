/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import mockAnnotations from '../../../components/annotations_table/__mocks__/mock_annotations.json';

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { Annotation } from '../../../../common/types/annotations';
import { AnnotationFlyout } from './index';

describe('AnnotationFlyout', () => {
  test('Initialization.', () => {
    const props = {
      mlAnnotations: {
        deleteAnnotation: (id: string | undefined) => new Promise(resolve => ({})),
        indexAnnotation: (annotation: Annotation) => new Promise(resolve => ({})),
      },
    };

    const wrapper = shallowWithIntl(<AnnotationFlyout {...props} />);
    expect(wrapper).toMatchSnapshot();
  });
});
