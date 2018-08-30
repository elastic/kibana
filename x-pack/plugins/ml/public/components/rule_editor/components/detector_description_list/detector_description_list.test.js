/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { shallow } from 'enzyme';
import React from 'react';

import { DetectorDescriptionList } from './detector_description_list';

describe('DetectorDescriptionList', () => {

  test('render for farequote detector', () => {

    const props = {
      job: {
        job_id: 'farequote'
      },
      detector: {
        detector_description: 'mean response time'
      }
    };

    const component = shallow(
      <DetectorDescriptionList {...props} />
    );

    expect(component).toMatchSnapshot();

  });

});
