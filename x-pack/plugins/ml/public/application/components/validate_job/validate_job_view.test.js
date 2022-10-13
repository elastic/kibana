/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';

import { ValidateJob } from './validate_job_view';

jest.mock('../../util/dependency_cache', () => ({
  getDocLinks: () => ({
    links: {
      ml: {
        anomalyDetectionJobTips: 'jest-metadata-mock-url',
      },
    },
  }),
}));

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  withKibana: (comp) => {
    return comp;
  },
}));

const job = {
  job_id: 'test-id',
};

const getJobConfig = () => job;
const getDuration = () => ({ start: 0, end: 1 });

function prepareTest(messages) {
  const p = Promise.resolve(messages);

  const ml = {
    validateJob: () => Promise.resolve(messages),
  };
  const kibana = {
    services: {
      notifications: { toasts: { addDanger: jest.fn(), addError: jest.fn() } },
    },
  };

  const component = (
    <ValidateJob getDuration={getDuration} getJobConfig={getJobConfig} ml={ml} kibana={kibana} />
  );

  const wrapper = shallowWithIntl(component);

  return { wrapper, p };
}

describe('ValidateJob', () => {
  const test1 = prepareTest({
    success: true,
    messages: [],
  });

  test('renders the button', () => {
    expect(test1.wrapper).toMatchSnapshot();
  });

  test('renders the button and modal with a success message', () => {
    test1.wrapper.instance().validate();
    test1.p.then(() => {
      test1.wrapper.update();
      expect(test1.wrapper).toMatchSnapshot();
    });
  });

  const test2 = prepareTest({
    success: true,
    messages: [
      {
        fieldName: 'airline',
        id: 'over_field_low_cardinality',
        status: 'warning',
        text: 'Cardinality of over_field "airline" is low and therefore less suitable for population analysis.',
        url: 'https://www.elastic.co/blog/sizing-machine-learning-with-elasticsearch',
      },
    ],
  });

  test('renders button and modal with a message', () => {
    test2.wrapper.instance().validate();
    test2.p.then(() => {
      test2.wrapper.update();
      expect(test2.wrapper).toMatchSnapshot();
    });
  });
});
