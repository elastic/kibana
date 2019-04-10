/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { TestProviders } from '../../../../mock';
import { networkModel } from '../../../../store';

import { IpOverview } from './index';
import { mockData } from './mock';

describe('IP Overview Component', () => {
  describe('rendering', () => {
    test('it renders the default IP Overview', () => {
      const wrapper = shallow(
        <TestProviders>
          <IpOverview
            loading={false}
            flowType={networkModel.IpOverviewType}
            ip="10.10.10.10"
            data={mockData.IpOverview}
            type={networkModel.NetworkType.details}
          />
        </TestProviders>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
