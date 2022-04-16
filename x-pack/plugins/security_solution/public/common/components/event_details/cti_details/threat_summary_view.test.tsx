/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ThreatSummaryView } from './threat_summary_view';
import { TestProviders } from '../../../mock';
import { render } from '@testing-library/react';
import { buildEventEnrichmentMock } from '../../../../../common/search_strategy/security_solution/cti/index.mock';
import { mockAlertDetailsData } from '../__mocks__';
import { TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { mockBrowserFields } from '../../../containers/source/mock';
import { mockTimelines } from '../../../mock/mock_timelines_plugin';

jest.mock('../../../lib/kibana', () => ({
  useKibana: () => ({
    services: {
      timelines: { ...mockTimelines },
    },
  }),
}));

jest.mock('../table/action_cell');
jest.mock('../table/field_name_cell');

describe('ThreatSummaryView', () => {
  const eventId = '5d1d53da502f56aacc14c3cb5c669363d102b31f99822e5d369d4804ed370a31';
  const timelineId = 'detections-page';
  const data = mockAlertDetailsData as TimelineEventsDetailsItem[];
  const browserFields = mockBrowserFields;

  it("renders 'Enriched with Threat Intelligence' panel with fields", () => {
    const enrichments = [
      buildEventEnrichmentMock({ 'matched.id': ['test.id'], 'matched.field': ['test.field'] }),
      buildEventEnrichmentMock({ 'matched.id': ['other.id'], 'matched.field': ['other.field'] }),
    ];
    const { getByText, getAllByTestId } = render(
      <TestProviders>
        <ThreatSummaryView
          data={data}
          browserFields={browserFields}
          enrichments={enrichments}
          eventId={eventId}
          timelineId={timelineId}
          hostRisk={null}
        />
      </TestProviders>
    );

    expect(getByText('Enriched with Threat Intelligence')).toBeInTheDocument();

    expect(getAllByTestId('EnrichedDataRow')).toHaveLength(enrichments.length);
  });
});
