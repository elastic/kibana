/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import styled from 'styled-components';
import { get } from 'lodash/fp';
import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { partition } from 'lodash';
import * as i18n from './translations';
import { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import { getEnrichmentIdentifiers, isInvestigationTimeEnrichment } from './helpers';

import { FieldsData } from '../types';
import { ActionCell } from '../table/action_cell';
import { BrowserField, BrowserFields, TimelineEventsDetailsItem } from '../../../../../common';
import { FormattedFieldValue } from '../../../../timelines/components/timeline/body/renderers/formatted_field';
import { EnrichedDataRow, ThreatSummaryPanelHeader } from './threat_summary_view';

export interface ThreatSummaryDescription {
  browserField: BrowserField;
  data: FieldsData | undefined;
  eventId: string;
  index: number;
  provider: string | undefined;
  timelineId: string;
  value: string | undefined;
  isDraggable?: boolean;
}

const EnrichmentFieldProvider = styled.span`
  margin-left: ${({ theme }) => theme.eui.paddingSizes.xs};
  white-space: nowrap;
  font-style: italic;
`;

const EnrichmentDescription: React.FC<ThreatSummaryDescription> = ({
  browserField,
  data,
  eventId,
  index,
  provider,
  timelineId,
  value,
  isDraggable,
}) => {
  if (!data || !value) return null;
  const key = `alert-details-value-formatted-field-value-${timelineId}-${eventId}-${data.field}-${value}-${index}-${provider}`;
  return (
    <EuiFlexGroup key={key} direction="row" gutterSize="none" alignItems="center">
      <EuiFlexItem grow={false}>
        <div className="eui-textBreakAll">
          <FormattedFieldValue
            contextId={timelineId}
            eventId={key}
            fieldFormat={data.format}
            fieldName={data.field}
            fieldType={data.type}
            isDraggable={isDraggable}
            isObjectArray={data.isObjectArray}
            value={value}
          />
          {provider && (
            <EnrichmentFieldProvider>
              {i18n.PROVIDER_PREPOSITION} {provider}
            </EnrichmentFieldProvider>
          )}
        </div>
      </EuiFlexItem>
      <EuiFlexItem>
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
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const EnrichmentSummaryComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  enrichments: CtiEnrichment[];
  timelineId: string;
  eventId: string;
  isDraggable?: boolean;
}> = ({ browserFields, data, enrichments, timelineId, eventId, isDraggable }) => {
  const parsedEnrichments = enrichments.map((enrichment, index) => {
    const { field, type, provider, value } = getEnrichmentIdentifiers(enrichment);
    const eventData = data.find((item) => item.field === field);
    const category = eventData?.category ?? '';
    const browserField = get([category, 'fields', field ?? ''], browserFields);

    const fieldsData: FieldsData = {
      field: field ?? '',
      format: browserField?.format ?? '',
      type: browserField?.type ?? '',
      isObjectArray: eventData?.isObjectArray ?? false,
    };

    return {
      fieldsData,
      type,
      provider,
      index,
      field,
      browserField,
      value,
    };
  });

  const [investigation, indicator] = partition(parsedEnrichments, ({ type }) =>
    isInvestigationTimeEnrichment(type)
  );

  return (
    <>
      {indicator.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder paddingSize="s" grow={false}>
            <ThreatSummaryPanelHeader
              title={i18n.INDICATOR_ENRICHMENT_TITLE}
              toolTipContent={i18n.INDICATOR_TOOLTIP_CONTENT}
            />

            {indicator.map(({ fieldsData, index, field, provider, browserField, value }) => (
              <EnrichedDataRow
                key={field}
                field={field}
                value={
                  <EnrichmentDescription
                    eventId={eventId}
                    index={index}
                    provider={provider}
                    timelineId={timelineId}
                    value={value}
                    data={fieldsData}
                    browserField={browserField}
                    isDraggable={isDraggable}
                  />
                }
              />
            ))}
          </EuiPanel>
        </EuiFlexItem>
      )}

      {investigation.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiPanel hasBorder paddingSize="s" grow={false}>
            <ThreatSummaryPanelHeader
              title={i18n.INVESTIGATION_ENRICHMENT_TITLE}
              toolTipContent={i18n.INVESTIGATION_TOOLTIP_CONTENT}
            />

            {investigation.map(({ fieldsData, index, field, provider, browserField, value }) => (
              <EnrichedDataRow
                key={field}
                field={field}
                value={
                  <EnrichmentDescription
                    eventId={eventId}
                    index={index}
                    provider={provider}
                    timelineId={timelineId}
                    value={value}
                    data={fieldsData}
                    browserField={browserField}
                    isDraggable={isDraggable}
                  />
                }
              />
            ))}
          </EuiPanel>
        </EuiFlexItem>
      )}
    </>
  );
};
export const EnrichmentSummary = React.memo(EnrichmentSummaryComponent);
