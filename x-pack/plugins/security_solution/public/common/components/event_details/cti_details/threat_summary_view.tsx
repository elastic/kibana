/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import React from 'react';
import { EuiBasicTableColumn, EuiText, EuiTitle } from '@elastic/eui';

import * as i18n from './translations';
import { StyledEuiInMemoryTable } from '../summary_view';
import { FormattedFieldValue } from '../../../../timelines/components/timeline/body/renderers/formatted_field';
import { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import { getEnrichmentIdentifiers } from './helpers';
import { EnrichmentIcon } from './enrichment_icon';

export interface ThreatSummaryItem {
  title: {
    title: string | undefined;
    type: string | undefined;
  };
  description: {
    timelineId: string;
    eventId: string;
    fieldName: string | undefined;
    index: number;
    value: string | undefined;
    provider: string | undefined;
  };
}

const RightMargin = styled.span`
  margin-right: ${({ theme }) => theme.eui.paddingSizes.xs};
`;

const EnrichmentTitle: React.FC<ThreatSummaryItem['title']> = ({ title, type }) => (
  <>
    <RightMargin>
      <EuiTitle size="xxxs">
        <h5>{title}</h5>
      </EuiTitle>
    </RightMargin>
    <EnrichmentIcon type={type} />
  </>
);

const EnrichmentDescription: React.FC<ThreatSummaryItem['description']> = ({
  timelineId,
  eventId,
  fieldName,
  index,
  value,
  provider,
}) => {
  const key = `alert-details-value-formatted-field-value-${timelineId}-${eventId}-${fieldName}-${value}-${index}-${provider}`;
  return (
    <>
      <RightMargin>
        <FormattedFieldValue
          key={key}
          contextId={key}
          eventId={eventId}
          fieldName={fieldName || 'unknown'}
          value={value}
        />
      </RightMargin>
      {provider && (
        <>
          <RightMargin>
            <EuiText size="xs">
              <em>{i18n.PROVIDER_PREPOSITION}</em>
            </EuiText>
          </RightMargin>
          <RightMargin>
            <EuiText grow={false} size="xs">
              {provider}
            </EuiText>
          </RightMargin>
        </>
      )}
    </>
  );
};

const buildThreatSummaryItems = (
  enrichments: CtiEnrichment[],
  timelineId: string,
  eventId: string
) => {
  return enrichments.map((enrichment, index) => {
    const { field, type, value, provider } = getEnrichmentIdentifiers(enrichment);

    return {
      title: {
        title: field,
        type,
      },
      description: {
        eventId,
        fieldName: field,
        index,
        provider,
        timelineId,
        value,
      },
    };
  });
};

const columns: Array<EuiBasicTableColumn<ThreatSummaryItem>> = [
  {
    field: 'title',
    truncateText: false,
    render: EnrichmentTitle,
    width: '160px',
    name: '',
  },
  {
    field: 'description',
    truncateText: false,
    render: EnrichmentDescription,
    name: '',
  },
];

const ThreatSummaryViewComponent: React.FC<{
  enrichments: CtiEnrichment[];
  timelineId: string;
  eventId: string;
}> = ({ enrichments, timelineId, eventId }) => (
  <StyledEuiInMemoryTable
    columns={columns}
    compressed
    data-test-subj="threat-summary-view"
    items={buildThreatSummaryItems(enrichments, timelineId, eventId)}
  />
);

export const ThreatSummaryView = React.memo(ThreatSummaryViewComponent);
