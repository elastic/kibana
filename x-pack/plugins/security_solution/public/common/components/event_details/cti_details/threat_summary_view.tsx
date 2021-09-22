/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { get } from 'lodash/fp';
import React, { Fragment } from 'react';
import { EuiBasicTableColumn, EuiText, EuiTitle } from '@elastic/eui';

import * as i18n from './translations';
import { Indent, StyledEuiInMemoryTable } from '../summary_view';
import { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import { getEnrichmentIdentifiers } from './helpers';
import { EnrichmentIcon } from './enrichment_icon';
import { FieldsData } from '../types';
import { ActionCell } from '../table/action_cell';
import { BrowserField, BrowserFields, TimelineEventsDetailsItem } from '../../../../../common';
import { FieldValueCell } from '../table/field_value_cell';

export interface ThreatSummaryItem {
  title: {
    title: string | undefined;
    type: string | undefined;
  };
  description: {
    browserField: BrowserField;
    data: FieldsData | undefined;
    eventId: string;
    index: number;
    provider: string | undefined;
    timelineId: string;
    value: string | undefined;
  };
}

const RightMargin = styled.span`
  margin-right: ${({ theme }) => theme.eui.paddingSizes.xs};
  min-width: 30px;
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
  browserField,
  data,
  eventId,
  index,
  provider,
  timelineId,
  value,
}) => {
  if (!data || !value) return null;
  const key = `alert-details-value-formatted-field-value-${timelineId}-${eventId}-${data.field}-${value}-${index}-${provider}`;
  return (
    <Fragment key={key}>
      <RightMargin>
        <FieldValueCell
          contextId={timelineId}
          data={data}
          eventId={key}
          fieldFromBrowserField={browserField}
          values={[value]}
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
      {value && (
        <ActionCell
          data={data}
          contextId={timelineId}
          eventId={key}
          fieldFromBrowserField={browserField}
          timelineId={timelineId}
          values={[value]}
        />
      )}
    </Fragment>
  );
};

const buildThreatSummaryItems = (
  browserFields: BrowserFields,
  data: TimelineEventsDetailsItem[],
  enrichments: CtiEnrichment[],
  timelineId: string,
  eventId: string
) => {
  return enrichments.map((enrichment, index) => {
    const { field, type, value, provider } = getEnrichmentIdentifiers(enrichment);
    const eventData = data.find((item) => item.field === field);
    const category = eventData?.category ?? '';
    const browserField = get([category, 'fields', field ?? ''], browserFields);

    const fieldsData = {
      field,
      format: browserField?.format ?? '',
      type: browserField?.type ?? '',
      isObjectArray: eventData?.isObjectArray,
    };

    return {
      title: {
        title: field,
        type,
      },
      description: {
        eventId,
        index,
        provider,
        timelineId,
        value,
        data: fieldsData,
        browserField,
      },
    };
  });
};

const columns: Array<EuiBasicTableColumn<ThreatSummaryItem>> = [
  {
    field: 'title',
    truncateText: false,
    render: EnrichmentTitle,
    width: '220px',
    name: '',
  },
  {
    className: 'flyoutOverviewDescription',
    field: 'description',
    truncateText: false,
    render: EnrichmentDescription,
    name: '',
  },
];

const ThreatSummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  enrichments: CtiEnrichment[];
  eventId: string;
  timelineId: string;
}> = ({ browserFields, data, enrichments, eventId, timelineId }) => (
  <Indent>
    <StyledEuiInMemoryTable
      columns={columns}
      compressed
      data-test-subj="threat-summary-view"
      items={buildThreatSummaryItems(browserFields, data, enrichments, timelineId, eventId)}
    />
  </Indent>
);

export const ThreatSummaryView = React.memo(ThreatSummaryViewComponent);
