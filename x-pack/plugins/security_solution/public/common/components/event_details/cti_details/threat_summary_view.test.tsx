/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { isEqual } from 'lodash';

import { ThreatSummaryView, buildThreatSummaryItems } from './threat_summary_view';
import { TestProviders } from '../../../mock';
import { useMountAppended } from '../../../utils/use_mount_appended';
import { buildEventEnrichmentMock } from '../../../../../common/search_strategy/security_solution/cti/index.mock';

jest.mock('../../../../timelines/components/timeline/body/renderers/formatted_field');

describe('ThreatSummaryView', () => {
  const mount = useMountAppended();
  const eventId = '5d1d53da502f56aacc14c3cb5c669363d102b31f99822e5d369d4804ed370a31';
  const timelineId = 'detections-page';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a row for each enrichment', () => {
    const enrichments = [
      buildEventEnrichmentMock(),
      buildEventEnrichmentMock({ 'matched.id': ['other.id'], 'matched.field': ['other.field'] }),
    ];
    const wrapper = mount(
      <TestProviders>
        <ThreatSummaryView enrichments={enrichments} eventId={eventId} timelineId={timelineId} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="threat-summary-view"] .euiTableRow')).toHaveLength(
      enrichments.length
    );
  });

  describe('buildThreatSummaryItems', () => {
    it('dedupes same key-value-provider items', () => {
      const enrichmentsWithDupes = [
        buildEventEnrichmentMock(),
        buildEventEnrichmentMock(),
        buildEventEnrichmentMock({ 'matched.id': ['other.id'], 'matched.field': ['other.field'] }),
        buildEventEnrichmentMock({ 'matched.id': ['other.id'], 'matched.field': ['other.field'] }),
      ];
      expect(
        buildThreatSummaryItems(enrichmentsWithDupes, 'test_timeline_id', 'test_event_id')
      ).toHaveLength(2);
    });

    it('sorts by provider', () => {
      const enrichmentsWithUnsortedProviders = [
        buildEventEnrichmentMock({ 'threatintel.indicator.provider': [''] }),
        buildEventEnrichmentMock({ 'threatintel.indicator.provider': ['b'] }),
        buildEventEnrichmentMock({ 'threatintel.indicator.provider': ['z'] }),
        buildEventEnrichmentMock({ 'threatintel.indicator.provider': ['a'] }),
      ];

      expect(
        isEqual(
          buildThreatSummaryItems(
            enrichmentsWithUnsortedProviders,
            'test_timeline_id',
            'test_event_id'
          ).map((item) => item.description.provider),
          ['a', 'b', 'z', '']
        )
      ).toBe(true);
    });
  });
});
