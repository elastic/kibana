/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import { cloneDeep, omit } from 'lodash/fp';
import React from 'react';

import { suricataRowRenderer } from '.';
import { mockECSData } from '../../../../pages/mock/mock_ecs';
import { ECS } from '../../ecs';

describe('plain_row_renderer', () => {
  let nonSuricata: ECS;
  let suricata: ECS;

  beforeEach(() => {
    nonSuricata = cloneDeep(mockECSData[0]);
    suricata = cloneDeep(mockECSData[2]);
  });

  test('should return false if not a suricata datum', () => {
    expect(suricataRowRenderer.isInstance(nonSuricata)).toBe(false);
  });

  test('should return true if it is a suricata datum', () => {
    expect(suricataRowRenderer.isInstance(suricata)).toBe(true);
  });

  test('should render children normally if it does not have a signature', () => {
    const children = suricataRowRenderer.renderRow(nonSuricata, <span>some children</span>);
    const wrapper = mount(<span>{children}</span>);
    expect(wrapper.text()).toEqual('some children');
  });

  test('should render a suricata row', () => {
    const children = suricataRowRenderer.renderRow(suricata, <span>some children </span>);
    const wrapper = mount(<span>{children}</span>);
    expect(wrapper.text()).toEqual(
      'some children ET EXPLOIT NETGEAR WNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)'
    );
  });

  test('should render a suricata row even if it does not have a suricata signature', () => {
    const withoutSignature = omit('suricata.eve.alert.signature', suricata);
    const children = suricataRowRenderer.renderRow(withoutSignature, <span>some children</span>);
    const wrapper = mount(<span>{children}</span>);
    expect(wrapper.text()).toEqual('some children');
  });
});
