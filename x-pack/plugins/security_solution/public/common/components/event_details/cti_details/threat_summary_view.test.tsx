/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ThreatSummaryView } from './threat_summary_view';
import { TestProviders } from '../../../mock';
import { useMountAppended } from '../../../utils/use_mount_appended';
import { buildEventEnrichmentMock } from '../../../../../common/search_strategy/security_solution/cti/index.mock';
import { mockAlertDetailsData } from '../__mocks__';
import { TimelineEventsDetailsItem } from '../../../../../../timelines/common';
import { mockBrowserFields } from '../../../containers/source/mock';

jest.mock('../table/action_cell');
jest.mock('../table/field_name_cell');

describe('ThreatSummaryView', () => {
  const mount = useMountAppended();
  const eventId = '5d1d53da502f56aacc14c3cb5c669363d102b31f99822e5d369d4804ed370a31';
  const timelineId = 'detections-page';
  const data = mockAlertDetailsData as TimelineEventsDetailsItem[];
  const browserFields = mockBrowserFields;

  it('renders a row for each enrichment', () => {
    const enrichments = [
      buildEventEnrichmentMock({ 'matched.id': ['test.id'], 'matched.field': ['test.field'] }),
      buildEventEnrichmentMock({ 'matched.id': ['other.id'], 'matched.field': ['other.field'] }),
    ];
    const wrapper = mount(
      <TestProviders>
        <ThreatSummaryView
          data={data}
          browserFields={browserFields}
          enrichments={enrichments}
          eventId={eventId}
          timelineId={timelineId}
        />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj="threat-summary-view"] .euiTableRow')).toHaveLength(
      enrichments.length
    );
  });
});
