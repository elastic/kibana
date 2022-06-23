/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import jobConfig from '../../../../../common/types/__mocks__/job_config_farequote.json';
import mockAnnotations from './__mocks__/mock_annotations.json';

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { AnnotationsTable } from './annotations_table';

jest.mock('../../../services/job_service', () => ({
  mlJobService: {
    getJob: jest.fn(),
  },
}));

jest.mock('../../../services/ml_api_service', () => {
  const { of } = require('rxjs');
  const mockAnnotations$ = of({ annotations: [] });
  return {
    ml: {
      annotations: {
        getAnnotations$: jest.fn().mockReturnValue(mockAnnotations$),
      },
    },
  };
});

describe('AnnotationsTable', () => {
  test('Minimal initialization without props.', () => {
    const wrapper = shallowWithIntl(<AnnotationsTable />);
    expect(wrapper).toMatchSnapshot();
  });

  test('Initialization with job config prop.', () => {
    const wrapper = shallowWithIntl(<AnnotationsTable jobs={[jobConfig]} />);
    expect(wrapper).toMatchSnapshot();
  });

  test('Initialization with annotations prop.', () => {
    const wrapper = shallowWithIntl(<AnnotationsTable annotations={mockAnnotations.slice(0, 1)} />);
    expect(wrapper).toMatchSnapshot();
  });
});
