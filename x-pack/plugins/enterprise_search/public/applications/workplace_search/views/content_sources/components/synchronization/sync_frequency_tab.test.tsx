/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '../../../../../__mocks__/shallow_useeffect.mock';
import { setMockValues } from '../../../../../__mocks__/kea_logic';
import { fullContentSources } from '../../../../__mocks__/content_sources.mock';

import React from 'react';

import { shallow } from 'enzyme';
import { cloneDeep } from 'lodash';

import { FrequencyItem } from './frequency_item';
import { SyncFrequency } from './sync_frequency_tab';

describe('SyncFrequency', () => {
  const contentSource = fullContentSources[0];
  const sourceWithNoDLP = cloneDeep(contentSource);
  sourceWithNoDLP.indexing.schedule.permissions = undefined as any;
  sourceWithNoDLP.indexing.schedule.estimates.permissions = undefined as any;
  const {
    indexing: { schedule },
  } = contentSource;

  it('renders with DLP', () => {
    setMockValues({ contentSource, schedule });
    const wrapper = shallow(<SyncFrequency />);

    expect(wrapper.find(FrequencyItem)).toHaveLength(4);
  });

  it('renders without DLP', () => {
    setMockValues({
      schedule: sourceWithNoDLP.indexing.schedule,
    });
    const wrapper = shallow(<SyncFrequency />);

    expect(wrapper.find(FrequencyItem)).toHaveLength(3);
  });
});
