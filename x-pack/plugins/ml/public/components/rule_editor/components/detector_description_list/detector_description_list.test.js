/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import React from 'react';

import { DetectorDescriptionList } from './detector_description_list';

describe('DetectorDescriptionList', () => {

  test('render for detector with anomaly values', () => {

    const props = {
      job: {
        job_id: 'responsetimes'
      },
      detector: {
        detector_description: 'mean response time'
      },
      anomaly: {
        actual: [50],
        typical: [1.23],
        source: { function: 'mean' },
      },
    };

    const component = shallowWithIntl(
      <DetectorDescriptionList {...props} />
    );

    expect(component).toMatchSnapshot();

  });

  test('render for population detector with no anomaly values', () => {

    const props = {
      job: {
        job_id: 'population'
      },
      detector: {
        detector_description: 'count by status over clientip'
      },
      anomaly: {
        source: { function: 'count' },
        causes: [
          {
            actual: [50],
            typical: [1.01]
          },
          {
            actual: [60],
            typical: [1.2]
          },
        ],
      },
    };

    const component = shallowWithIntl(
      <DetectorDescriptionList {...props} />
    );

    expect(component).toMatchSnapshot();

  });

});
