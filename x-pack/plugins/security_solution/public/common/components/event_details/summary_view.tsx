/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, getOr } from 'lodash/fp';
import {
  EuiTitle,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiInMemoryTable,
  EuiBasicTableColumn,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import * as i18n from './translations';
import { BrowserFields } from '../../../../common/search_strategy/index_fields';
import {
  ALERTS_HEADERS_RISK_SCORE,
  ALERTS_HEADERS_RULE,
  ALERTS_HEADERS_SEVERITY,
  ALERTS_HEADERS_THRESHOLD_COUNT,
  ALERTS_HEADERS_THRESHOLD_TERMS,
  ALERTS_HEADERS_THRESHOLD_CARDINALITY,
} from '../../../detections/components/alerts_table/translations';
import {
  IP_FIELD_TYPE,
  SIGNAL_RULE_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { DESTINATION_IP_FIELD_NAME, SOURCE_IP_FIELD_NAME } from '../../../network/components/ip';
import { LineClamp } from '../line_clamp';
import { useRuleAsync } from '../../../detections/containers/detection_engine/rules/use_rule_async';
import { getDataFromSourceHits } from '../../../../common/utils/field_formatters';

interface SummaryRow {
  title: string;
  description: {
    contextId: string;
    eventId: string;
    fieldName: string;
    values: string[];
    fieldType?: string;
    linkValue?: string;
    keySuffix?: string;
    isDraggingDisabled?: boolean;
  };
}
type Summary = SummaryRow[];

export interface SummaryViewProps {
  browserFields?: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  isDisplayingThreatDetails?: boolean;
  isDisplayingThreatSummary?: boolean;
  timelineId: string;
}

const fields = [
  { id: 'signal.status' },
  { id: '@timestamp' },
  {
    id: SIGNAL_RULE_NAME_FIELD_NAME,
    linkField: 'signal.rule.id',
    label: ALERTS_HEADERS_RULE,
  },
  { id: 'signal.rule.severity', label: ALERTS_HEADERS_SEVERITY },
  { id: 'signal.rule.risk_score', label: ALERTS_HEADERS_RISK_SCORE },
  { id: 'host.name' },
  { id: 'user.name' },
  { id: SOURCE_IP_FIELD_NAME, fieldType: IP_FIELD_TYPE },
  { id: DESTINATION_IP_FIELD_NAME, fieldType: IP_FIELD_TYPE },
  { id: 'signal.threshold_result.count', label: ALERTS_HEADERS_THRESHOLD_COUNT },
  { id: 'signal.threshold_result.terms', label: ALERTS_HEADERS_THRESHOLD_TERMS },
  { id: 'signal.threshold_result.cardinality', label: ALERTS_HEADERS_THRESHOLD_CARDINALITY },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StyledEuiInMemoryTable = styled(EuiInMemoryTable as any)`
  .euiTableHeaderCell {
    border: none;
  }
  .euiTableRowCell {
    border: none;
  }

  .euiTableCellContent {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const StyledEuiDescriptionList = styled(EuiDescriptionList)`
  padding: 24px 4px 4px;
`;

const getTitle = (title: SummaryRow['title']) => (
  <EuiTitle size="xxs">
    <h5>{title}</h5>
  </EuiTitle>
);

getTitle.displayName = 'getTitle';

const getDescription = ({
  contextId,
  eventId,
  fieldName,
  values,
  fieldType = '',
  linkValue,
  keySuffix,
  isDraggingDisabled,
}: SummaryRow['description']) =>
  values.map((value) => (
    <FormattedFieldValue
      key={`alert-details-value-formatted-field-value-${contextId}-${eventId}-${fieldName}-${value}-${keySuffix}-key`}
      contextId={`alert-details-value-formatted-field-value-${contextId}-${eventId}-${fieldName}-${value}-${keySuffix}`}
      eventId={eventId}
      fieldName={fieldName}
      fieldType={fieldType}
      value={value}
      linkValue={linkValue}
      isDraggingDisabled={isDraggingDisabled}
    />
  ));

const getSummary = ({
  data,
  browserFields,
  timelineId: contextId,
  eventId,
  isDisplayingThreatSummary,
  isDisplayingThreatDetails,
}: {
  data: TimelineEventsDetailsItem[];
  browserFields?: BrowserFields;
  timelineId: string;
  eventId: string;
  isDisplayingThreatSummary: boolean;
  isDisplayingThreatDetails: boolean;
}) => {
  if (!data) return [];
  if (isDisplayingThreatSummary || isDisplayingThreatDetails) {
    return data.reduce<Summary>((acc, { category, field, originalValue }) => {
      if (isDisplayingThreatDetails && field === 'threat.indicator' && originalValue) {
        const isOriginalValueArray = Array.isArray(originalValue);
        const isArrayIndexVisible = isOriginalValueArray && originalValue.length > 1;
        const threatData = isArrayIndexVisible
          ? originalValue.map((threatDataItem: string) => JSON.parse(threatDataItem))
          : isOriginalValueArray
          ? JSON.parse(originalValue[0])
          : JSON.parse(originalValue);

        return getDataFromSourceHits(threatData).map((threatInfoItem) => {
          const fieldName = `threat.indicator.${
            isArrayIndexVisible
              ? threatInfoItem.field.split('.').slice(1).join('.')
              : threatInfoItem.field
          }`;
          return {
            title: threatInfoItem.field,
            description: {
              contextId,
              eventId,
              fieldName,
              values: threatInfoItem.originalValue,
              keySuffix: isArrayIndexVisible ? threatInfoItem.field.split('.')[0] : undefined,
              isDraggingDisabled: true,
            },
          };
        });
      } else if (
        isDisplayingThreatSummary &&
        field.startsWith('threat.indicator.') &&
        originalValue
      ) {
        return [
          ...acc,
          {
            title: field.substring('threat.indicator.'.length),
            description: {
              values: Array.isArray(originalValue) ? originalValue : [originalValue],
              contextId,
              eventId,
              fieldName: field,
            },
          },
        ];
      }
      return acc;
    }, []);
  } else {
    return fields.reduce<Summary>((acc, item) => {
      const field = data.find((d) => d.field === item.id);
      if (!field) {
        return acc;
      }
      const linkValueField = item.linkField != null && data.find((d) => d.field === item.linkField);
      const linkValue = getOr(null, 'originalValue.0', linkValueField);
      const value = getOr(null, 'originalValue.0', field);
      const category = field.category;
      const fieldType = get(`${category}.fields.${field.field}.type`, browserFields) as string;
      const description = {
        contextId,
        eventId,
        fieldName: item.id,
        values: [value],
        fieldType: item.fieldType ?? fieldType,
        linkValue: linkValue ?? undefined,
      };

      if (item.id === 'signal.threshold_result.terms') {
        try {
          const terms = getOr(null, 'originalValue', field);
          const parsedValue = terms.map((term: string) => JSON.parse(term));
          const thresholdTerms = (parsedValue ?? []).map(
            (entry: { field: string; value: string }) => {
              return {
                title: `${entry.field} [threshold]`,
                description: {
                  ...description,
                  values: [entry.value],
                },
              };
            }
          );
          return [...acc, ...thresholdTerms];
        } catch (err) {
          return acc;
        }
      }

      if (item.id === 'signal.threshold_result.cardinality') {
        try {
          const parsedValue = JSON.parse(value);
          return [
            ...acc,
            {
              title: ALERTS_HEADERS_THRESHOLD_CARDINALITY,
              description: {
                ...description,
                values: [`count(${parsedValue.field}) == ${parsedValue.value}`],
              },
            },
          ];
        } catch (err) {
          return acc;
        }
      }

      return [
        ...acc,
        {
          title: item.label ?? item.id,
          description,
        },
      ];
    }, []);
  }
};

const summaryColumns: Array<EuiBasicTableColumn<SummaryRow>> = [
  {
    field: 'title',
    truncateText: false,
    render: getTitle,
    width: '120px',
    name: '',
  },
  {
    field: 'description',
    truncateText: false,
    render: getDescription,
    name: '',
  },
];

export const SummaryViewComponent: React.FC<SummaryViewProps> = ({
  browserFields,
  data,
  eventId,
  isDisplayingThreatDetails = false,
  isDisplayingThreatSummary = false,
  timelineId,
}) => {
  const ruleId = useMemo(() => {
    const item = data.find((d) => d.field === 'signal.rule.id');
    return Array.isArray(item?.originalValue)
      ? item?.originalValue[0]
      : item?.originalValue ?? null;
  }, [data]);
  const { rule: maybeRule } = useRuleAsync(ruleId);
  const summaryList = useMemo(
    () =>
      getSummary({
        browserFields,
        data,
        eventId,
        isDisplayingThreatDetails,
        isDisplayingThreatSummary,
        timelineId,
      }),
    [browserFields, data, eventId, timelineId, isDisplayingThreatSummary, isDisplayingThreatDetails]
  );
  const isTableEmpty = isDisplayingThreatSummary && summaryList.length === 0;
  if (isTableEmpty) return null;

  return (
    <>
      <StyledEuiInMemoryTable
        data-test-subj={`${
          isDisplayingThreatDetails
            ? 'threat-details'
            : isDisplayingThreatSummary
            ? 'threat-summary'
            : 'summary'
        }-view`}
        items={summaryList}
        columns={summaryColumns}
        compressed
      />
      {maybeRule?.note && (
        <StyledEuiDescriptionList data-test-subj="summary-view-guide" compressed>
          <EuiDescriptionListTitle>{i18n.INVESTIGATION_GUIDE}</EuiDescriptionListTitle>
          <EuiDescriptionListDescription>
            <LineClamp content={maybeRule?.note} />
          </EuiDescriptionListDescription>
        </StyledEuiDescriptionList>
      )}
    </>
  );
};

export const SummaryView = React.memo(SummaryViewComponent);
