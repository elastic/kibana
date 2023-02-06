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
import type { CtiEnrichment } from '../../../../../common/search_strategy/security_solution/cti';
import { getEnrichmentIdentifiers, isInvestigationTimeEnrichment } from './helpers';

import type { FieldsData } from '../types';
import { ActionCell } from '../table/action_cell';
import type {
  BrowserField,
  BrowserFields,
  TimelineEventsDetailsItem,
} from '../../../../../common/search_strategy';
import { FormattedFieldValue } from '../../../../timelines/components/timeline/body/renderers/formatted_field';
import { EnrichedDataRow, ThreatSummaryPanelHeader } from './threat_summary_view';

export interface ThreatSummaryDescription {
  browserField: BrowserField;
  data: FieldsData | undefined;
  eventId: string;
  index: number;
  feedName: string | undefined;
  scopeId: string;
  value: string | undefined;
  isDraggable?: boolean;
  isReadOnly?: boolean;
}

const EnrichmentFieldFeedName = styled.span`
  white-space: nowrap;
  font-style: italic;
`;

export const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  .hoverActions-active {
    .timelines__hoverActionButton,
    .securitySolution__hoverActionButton {
      opacity: 1;
    }
  }

  &:hover {
    .timelines__hoverActionButton,
    .securitySolution__hoverActionButton {
      opacity: 1;
    }
  }
`;

const EnrichmentDescription: React.FC<ThreatSummaryDescription> = ({
  browserField,
  data,
  eventId,
  index,
  feedName,
  scopeId,
  value,
  isDraggable,
  isReadOnly,
}) => {
  if (!data || !value) return null;
  const key = `alert-details-value-formatted-field-value-${scopeId}-${eventId}-${data.field}-${value}-${index}-${feedName}`;
  return (
    <StyledEuiFlexGroup key={key} direction="row" gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <div>
          <FormattedFieldValue
            contextId={scopeId}
            eventId={key}
            fieldFormat={data.format}
            fieldName={data.field}
            fieldType={data.type}
            isDraggable={isDraggable}
            isObjectArray={data.isObjectArray}
            value={value}
            truncate={false}
          />
          {feedName && (
            <EnrichmentFieldFeedName>
              {' '}
              {i18n.FEED_NAME_PREPOSITION} {feedName}
            </EnrichmentFieldFeedName>
          )}
        </div>
      </EuiFlexItem>
      <EuiFlexItem>
        {value && !isReadOnly && (
          <ActionCell
            data={data}
            contextId={scopeId}
            eventId={key}
            fieldFromBrowserField={browserField}
            scopeId={scopeId}
            values={[value]}
            applyWidthAndPadding={false}
          />
        )}
      </EuiFlexItem>
    </StyledEuiFlexGroup>
  );
};

const EnrichmentSummaryComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  enrichments: CtiEnrichment[];
  scopeId: string;
  eventId: string;
  isDraggable?: boolean;
  isReadOnly?: boolean;
}> = ({ browserFields, data, enrichments, scopeId, eventId, isDraggable, isReadOnly }) => {
  const parsedEnrichments = enrichments.map((enrichment, index) => {
    const { field, type, feedName, value } = getEnrichmentIdentifiers(enrichment);
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
      feedName,
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

            {indicator.map(({ fieldsData, index, field, feedName, browserField, value }) => (
              <EnrichedDataRow
                key={field}
                field={field}
                value={
                  <EnrichmentDescription
                    eventId={eventId}
                    index={index}
                    feedName={feedName}
                    scopeId={scopeId}
                    value={value}
                    data={fieldsData}
                    browserField={browserField}
                    isDraggable={isDraggable}
                    isReadOnly={isReadOnly}
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

            {investigation.map(({ fieldsData, index, field, feedName, browserField, value }) => (
              <EnrichedDataRow
                key={field}
                field={field}
                value={
                  <EnrichmentDescription
                    eventId={eventId}
                    index={index}
                    feedName={feedName}
                    scopeId={scopeId}
                    value={value}
                    data={fieldsData}
                    browserField={browserField}
                    isDraggable={isDraggable}
                    isReadOnly={isReadOnly}
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
