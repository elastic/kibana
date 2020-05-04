/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { NoServicesMessage } from '../NoServicesMessage';
import { FETCH_STATUS } from '../../../../hooks/useFetcher';

describe('NoServicesMessage', () => {
  Object.values(FETCH_STATUS).forEach(status => {
    [true, false].forEach(historicalDataFound => {
      it(`status: ${status} and historicalDataFound: ${historicalDataFound}`, () => {
        const wrapper = shallow(
          <NoServicesMessage
            status={status}
            historicalDataFound={historicalDataFound}
          />
        );
        expect(wrapper).toMatchSnapshot();
      });
    });
  });
});
