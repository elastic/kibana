/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { cloneDeep } from 'lodash';
import { rowRenderers } from '.';
import { Ecs } from '../../../../graphql/types';
import { mockEcsData } from '../../../../mock';
import { getRowRenderer } from './get_row_renderer';

describe('get_column_renderer', () => {
  let nonSuricata: Ecs;
  let suricata: Ecs;

  beforeEach(() => {
    nonSuricata = cloneDeep(mockEcsData[0]);
    suricata = cloneDeep(mockEcsData[2]);
  });

  test('should render plain row data when it is a non suricata row', () => {
    const rowRenderer = getRowRenderer(nonSuricata, rowRenderers);
    const row = rowRenderer.renderRow(nonSuricata, <span>some child</span>);
    const wrapper = mount(<span>{row}</span>);
    expect(wrapper.text()).toContain('some child');
  });

  test('should render a suricata row data when it is a suricata row', () => {
    const rowRenderer = getRowRenderer(suricata, rowRenderers);
    const row = rowRenderer.renderRow(suricata, <span>some child </span>);
    const wrapper = mount(<span>{row}</span>);
    expect(wrapper.text()).toContain(
      'some child ET EXPLOIT NETGEAR WNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)'
    );
  });
});
