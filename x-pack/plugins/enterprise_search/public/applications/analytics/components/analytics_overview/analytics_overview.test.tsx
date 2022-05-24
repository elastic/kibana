/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { shallow, ShallowWrapper } from 'enzyme';

import { AnalyicsOverview } from '.';

describe('Analytics overview component', () => {
  let wrapper: ShallowWrapper;

  const setup = (param: string) => {
    Object.defineProperty(window, 'location', {
      value: { search: param },
      writable: true,
    });
    wrapper = shallow(<ElasticsearchGuide />);
  };
});
