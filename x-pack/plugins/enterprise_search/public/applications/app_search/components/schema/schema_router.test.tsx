/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setMockValues } from '../../../__mocks__/kea_logic';
import '../../__mocks__/engine_logic.mock';

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { shallow } from 'enzyme';

import { rerender } from '../../../test_helpers';

import { ReindexJob } from './reindex_job';
import { Schema, MetaEngineSchema } from './views';

import { SchemaRouter } from '.';

describe('SchemaRouter', () => {
  const wrapper = shallow(<SchemaRouter />);

  it('renders', () => {
    expect(wrapper.find(Switch)).toHaveLength(1);
    expect(wrapper.find(Route)).toHaveLength(2);
  });

  it('renders the ReindexJob route', () => {
    expect(wrapper.find(ReindexJob)).toHaveLength(1);
  });

  it('renders the MetaEngineSchema view if the current engine is a meta engine', () => {
    setMockValues({ isMetaEngine: true });
    rerender(wrapper);

    expect(wrapper.find(MetaEngineSchema)).toHaveLength(1);
    expect(wrapper.find(Schema)).toHaveLength(0);
  });

  it('renders the default Schema view if the current engine is not a meta engine', () => {
    setMockValues({ isMetaEngine: false });
    rerender(wrapper);

    expect(wrapper.find(Schema)).toHaveLength(1);
    expect(wrapper.find(MetaEngineSchema)).toHaveLength(0);
  });
});
