/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { cloneDeep } from 'lodash';
import { plainRowRenderer } from '.';
import { mockECSData } from '../../../../mock/mock_ecs';
import { ECS } from '../../ecs';

describe('plain_row_renderer', () => {
  let mockDatum: ECS;
  beforeEach(() => {
    mockDatum = cloneDeep(mockECSData[0]);
  });

  test('should always return isInstance true', () => {
    expect(plainRowRenderer.isInstance(mockDatum)).toBe(true);
  });

  test('should render a plain row', () => {
    const children = plainRowRenderer.renderRow(mockDatum, <span>some children</span>);
    const wrapper = mount(<span>{children}</span>);
    expect(wrapper.text()).toEqual('some children');
  });
});
