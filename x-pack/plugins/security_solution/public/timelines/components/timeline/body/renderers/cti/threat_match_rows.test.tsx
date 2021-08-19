/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Ecs } from '../../../../../../../common/ecs';

import { TestProviders } from '../../../../../../common/mock';
import { useMountAppended } from '../../../../../../common/utils/use_mount_appended';
import { ThreatMatchRows } from './threat_match_rows';

describe('ThreatMatchRows', () => {
  const mount = useMountAppended();
  it('renders a row for each datum', () => {
    const data = {
      _id: 'id',
      _index: 'index',
      threat: {
        enrichments: [{ matched: { atomic: ['atomic'], field: ['field'] } }],
      },
    };

    const wrapper = mount(
      <TestProviders>
        <ThreatMatchRows browserFields={{}} timelineId="test" isDraggable={false} data={data} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="threat-match-row"]').exists()).toEqual(true);
  });

  it('handles unmapped indicator data', () => {
    // @ts-expect-error this type is intentionally not compatible with Ecs;
    // it's what we receive if our threat.indicator mappings are absent
    const unmappedIndicatorData = {
      _id: 'id',
      _index: 'index',
      threat: {
        enrichments: { matched: { atomic: ['value'] } },
      },
    } as Ecs;

    const wrapper = mount(
      <TestProviders>
        <ThreatMatchRows
          browserFields={{}}
          timelineId="test"
          isDraggable={false}
          data={unmappedIndicatorData}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="threat-match-row"]').exists()).toEqual(true);
  });
});
