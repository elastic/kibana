/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { SetupModeTooltip } from './tooltip';
import {
  ELASTICSEARCH_SYSTEM_ID,
  KIBANA_SYSTEM_ID,
  BEATS_SYSTEM_ID,
  APM_SYSTEM_ID,
  LOGSTASH_SYSTEM_ID,
} from '../../../common/constants';

const SCENARIOS = [
  {
    name: 'no detectable instances',
    data: {
      totalUniqueInstanceCount: 0,
      detected: {
        mightExist: false,
      },
    },
  },
  {
    name: 'only detectable instances',
    data: {
      totalUniqueInstanceCount: 0,
      detected: {
        mightExist: true,
      },
    },
  },
  {
    name: 'allMonitoredByMetricbeat',
    data: {
      totalUniqueInstanceCount: 1,
      totalUniqueFullyMigratedCount: 1,
    },
  },
  {
    name: 'internalCollectionOn',
    data: {
      totalUniqueInstanceCount: 1,
      totalUniquePartiallyMigratedCount: 1,
    },
  },
  {
    name: 'allInternalCollection',
    data: {
      totalUniqueInstanceCount: 1,
      totalUniqueFullyMigratedCount: 0,
      totalUniquePartiallyMigratedCount: 0,
    },
  },
];

const PRODUCTS = [
  {
    name: ELASTICSEARCH_SYSTEM_ID,
  },
  {
    name: KIBANA_SYSTEM_ID,
  },
  {
    name: LOGSTASH_SYSTEM_ID,
  },
  {
    name: BEATS_SYSTEM_ID,
  },
  {
    name: APM_SYSTEM_ID,
  },
];

describe('setupMode SetupModeTooltip', () => {
  for (const scenario of SCENARIOS) {
    describe(`${scenario.name}`, () => {
      for (const { name } of PRODUCTS) {
        it(`should render for ${name}`, () => {
          const component = shallow(
            <SetupModeTooltip setupModeData={scenario.data} productName={name} badgeClickLink="" />
          );
          expect(component).toMatchSnapshot();
        });
      }
    });
  }
});
