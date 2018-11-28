/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { cloneDeep } from 'lodash';
import { rowRenderers } from '.';
import { mockECSData } from '../../../../mock/mock_ecs';
import { ECS } from '../../ecs';
import { getRowRenderer } from './get_row_renderer';

describe('get_column_renderer', () => {
  let nonSuricata: ECS;
  let suricata: ECS;

  beforeEach(() => {
    nonSuricata = cloneDeep(mockECSData[0]);
    suricata = cloneDeep(mockECSData[2]);
  });

  test('should render plain row data when it is a non suricata row', () => {
    const rowRenderer = getRowRenderer(nonSuricata, rowRenderers);
    const row = rowRenderer.renderRow(nonSuricata, <span>some child</span>);
    const wrapper = mount(<span>{row}</span>);
    expect(wrapper.text()).toEqual('some child');
  });

  test('should render a suricata row data when it is a suricata row', () => {
    const rowRenderer = getRowRenderer(suricata, rowRenderers);
    const row = rowRenderer.renderRow(suricata, <span>some child </span>);
    const wrapper = mount(<span>{row}</span>);
    expect(wrapper.text()).toEqual(
      'some child ET EXPLOIT NETGEAR WNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)'
    );
  });
});
