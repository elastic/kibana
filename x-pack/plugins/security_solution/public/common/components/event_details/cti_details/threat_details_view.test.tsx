/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount } from 'enzyme';

import { TestProviders } from '../../../mock';
import { buildEventEnrichmentMock } from '../../../../../common/search_strategy/security_solution/cti/index.mock';
import { FIRSTSEEN } from '../../../../../common/cti/constants';
import { ThreatDetailsView } from './threat_details_view';

describe('ThreatDetailsView', () => {
  it('renders a detail view for each enrichment', () => {
    const enrichments = [
      buildEventEnrichmentMock(),
      buildEventEnrichmentMock({ 'matched.id': ['other.id'], 'matched.field': ['other.field'] }),
    ];

    const wrapper = mount(
      <TestProviders>
        <ThreatDetailsView enrichments={enrichments} />
      </TestProviders>
    );

    expect(wrapper.find('[data-test-subj^="threat-details-view"]').hostNodes()).toHaveLength(
      enrichments.length
    );
  });

  it('renders anchor links for event.url and event.reference', () => {
    const enrichments = [
      buildEventEnrichmentMock({
        'event.url': ['http://foo.bar'],
        'event.reference': ['http://foo.baz'],
      }),
    ];
    const wrapper = mount(
      <TestProviders>
        <ThreatDetailsView enrichments={enrichments} />
      </TestProviders>
    );
    expect(wrapper.find('a').length).toEqual(2);
  });

  it('sorts same type of enrichments by first_seen descending', () => {
    const mostRecentDate = '2021-04-25T18:17:00.000Z';
    const olderDate = '2021-03-25T18:17:00.000Z';
    // this simulates a legacy enrichment from the old indicator match rule,
    // where first_seen is available at the top level
    const existingEnrichment = buildEventEnrichmentMock({
      first_seen: [mostRecentDate],
    });
    delete existingEnrichment['threatintel.indicator.first_seen'];
    const newEnrichment = buildEventEnrichmentMock({
      'matched.id': ['other.id'],
      'threatintel.indicator.first_seen': [olderDate],
    });
    const enrichments = [existingEnrichment, newEnrichment];

    const wrapper = mount(
      <TestProviders>
        <ThreatDetailsView enrichments={enrichments} />
      </TestProviders>
    );

    const firstSeenRows = wrapper
      .find('.euiTableRow')
      .hostNodes()
      .filterWhere((node) => node.text().includes(FIRSTSEEN));
    expect(firstSeenRows.map((node) => node.text())).toEqual([
      `first_seen${mostRecentDate}`,
      `first_seen${olderDate}`,
    ]);
  });

  it('groups enrichments by matched type', () => {
    const indicatorMatch = buildEventEnrichmentMock({
      'matched.type': ['indicator_match_rule'],
    });
    const investigationEnrichment = buildEventEnrichmentMock({
      'matched.type': ['investigation_time'],
    });
    const enrichments = [indicatorMatch, investigationEnrichment];

    const wrapper = mount(
      <TestProviders>
        <ThreatDetailsView enrichments={enrichments} />
      </TestProviders>
    );

    expect(wrapper.exists('[data-test-subj="threat-match-detected"]')).toEqual(true);
    expect(wrapper.exists('[data-test-subj="enriched-with-threat-intel"]')).toEqual(true);
  });
});
