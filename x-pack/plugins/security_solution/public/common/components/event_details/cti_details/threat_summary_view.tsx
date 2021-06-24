/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import React from 'react';
import { EuiBasicTableColumn, EuiIcon, EuiText, EuiTitle, EuiToolTip } from '@elastic/eui';

import * as i18n from './translations';
import { StyledEuiInMemoryTable } from '../summary_view';
import { FormattedFieldValue } from '../../../../timelines/components/timeline/body/renderers/formatted_field';
import {
  MATCHED_ATOMIC,
  MATCHED_FIELD,
  MATCHED_TYPE,
  PROVIDER,
} from '../../../../../common/cti/constants';
import { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../common/constants';
import { getTooltipTitle, getTooltipContent } from './helpers';

const getFirstElement: <T = unknown>(array: T[] | undefined) => T | undefined = (array) =>
  array ? array[0] : undefined;
const getEnrichmentValue = (enrichment: CtiEnrichment, field: string) =>
  getFirstElement(enrichment[field]) as string | undefined;

export interface ThreatSummaryItem {
  title: {
    title: string | undefined;
    type: string | undefined;
  };
  description: {
    timelineId: string;
    eventId: string;
    fieldName: string | undefined;
    value: string | undefined;
    provider: string | undefined;
  };
}

// Overrides flex styles declared in StyledEuiInMemoryTable
const FlexContainer = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
`;

const RightMargin = styled.span`
  margin-right: ${({ theme }) => theme.eui.paddingSizes.s};
`;

const EnrichmentTitle: React.FC<ThreatSummaryItem['title']> = ({ title, type }) => (
  <FlexContainer>
    <RightMargin>
      <EnrichmentIcon type={type} />
    </RightMargin>
    <EuiTitle size="xxs">
      <h5>{title}</h5>
    </EuiTitle>
  </FlexContainer>
);

const EnrichmentIcon: React.FC<{ type: string | undefined }> = ({ type }) => {
  return (
    <EuiToolTip title={getTooltipTitle(type)} content={getTooltipContent(type)}>
      <EuiIcon type="logoSecurity" size="s" />
    </EuiToolTip>
  );
};

const EnrichmentDescription: React.FC<ThreatSummaryItem['description']> = ({
  timelineId,
  eventId,
  fieldName,
  value,
  provider,
}) => (
  <FlexContainer>
    <RightMargin>
      <FormattedFieldValue
        key={`alert-details-value-formatted-field-value-${timelineId}-${eventId}-${fieldName}-${value}-key`}
        contextId={`alert-details-value-formatted-field-value-${timelineId}-${eventId}-${fieldName}-${value}`}
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
  </FlexContainer>
);

const buildThreatSummaryItems = (
  enrichments: CtiEnrichment[],
  timelineId: string,
  eventId: string
) => {
  return enrichments.map((enrichment) => {
    const field = getEnrichmentValue(enrichment, MATCHED_FIELD);
    const value = getEnrichmentValue(enrichment, MATCHED_ATOMIC);
    const type = getEnrichmentValue(enrichment, MATCHED_TYPE);
    // This value may be in one of two locations depending on whether it's an
    // old indicator alert or a new enrichment. Once enrichment has been
    // normalized and we support the new ECS fields, this value should always be
    // 'indicator.provider'
    const provider =
      getEnrichmentValue(enrichment, PROVIDER) ||
      getEnrichmentValue(enrichment, `${DEFAULT_INDICATOR_SOURCE_PATH}.${PROVIDER}`);

    return {
      title: {
        title: field,
        type,
      },
      description: {
        eventId,
        fieldName: field,
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
    dataTestSubj="threat-summary-view"
    items={buildThreatSummaryItems(enrichments, timelineId, eventId)}
  />
);

export const ThreatSummaryView = React.memo(ThreatSummaryViewComponent);
