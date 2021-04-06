/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';

import { getDetectionAlertFieldsMock, TestProviders } from '../../../../../../common/mock';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';
import { ThreatMatchRowView } from './threat_match_row';

describe('threatMatchRowView', () => {
  const mount = useMountAppended();
  let threatMatchFields: ReturnType<typeof getDetectionAlertFieldsMock>;

  beforeEach(() => {
    threatMatchFields = getDetectionAlertFieldsMock([
      { field: 'threat.indicator.matched.type', value: ['url'] },
    ]);
  });

  it('renders an indicator match row', () => {
    const wrapper = shallow(
      <ThreatMatchRowView
        indicatorDataset="dataset"
        indicatorProvider="provider"
        indicatorReference="http://example.com"
        indicatorType="domain"
        sourceField="host.name"
        sourceValue="http://elastic.co"
      />
    );

    expect(wrapper.find('[data-test-subj="threat-match-row"]').exists()).toEqual(true);
  });

  it('matches the registered snapshot', () => {
    const wrapper = shallow(
      <ThreatMatchRowView
        indicatorDataset="dataset"
        indicatorProvider="provider"
        indicatorReference="http://example.com"
        indicatorType="domain"
        sourceField="host.name"
        sourceValue="http://elastic.co"
      />
    );

    expect(wrapper).toMatchSnapshot();
  });

  it('renders draggable fields', () => {
    const wrapper = mount(
      <TestProviders>
        <ThreatMatchRowView
          indicatorDataset="dataset"
          indicatorProvider="provider"
          indicatorReference="http://example.com"
          indicatorType="domain"
          sourceField="host.name"
          sourceValue="http://elastic.co"
        />
      </TestProviders>
    );

    const sourceValueDraggable = wrapper.find('[data-test-subj="threat-match-row-source-value"]');
    expect(sourceValueDraggable.props()).toEqual(
      expect.objectContaining({
        field: 'host.name',
        value: 'http://elastic.co',
      })
    );
  });
});
