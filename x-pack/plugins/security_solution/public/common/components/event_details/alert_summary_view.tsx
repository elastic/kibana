/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTableColumn, EuiSpacer, EuiHorizontalRule, EuiTitle, EuiText } from '@elastic/eui';
import { get, getOr, find } from 'lodash/fp';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import * as i18n from './translations';
import { FormattedFieldValue } from '../../../timelines/components/timeline/body/renderers/formatted_field';
import { TimelineEventsDetailsItem } from '../../../../common/search_strategy';
import { BrowserFields } from '../../../../common/search_strategy/index_fields';
import {
  ALERTS_HEADERS_RISK_SCORE,
  ALERTS_HEADERS_RULE,
  ALERTS_HEADERS_SEVERITY,
  ALERTS_HEADERS_THRESHOLD_CARDINALITY,
  ALERTS_HEADERS_THRESHOLD_COUNT,
  ALERTS_HEADERS_THRESHOLD_TERMS,
  SIGNAL_STATUS,
  TIMESTAMP,
} from '../../../detections/components/alerts_table/translations';
import {
  IP_FIELD_TYPE,
  SIGNAL_RULE_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { DESTINATION_IP_FIELD_NAME, SOURCE_IP_FIELD_NAME } from '../../../network/components/ip';
import { SummaryView } from './summary_view';
import { AlertSummaryRow, getSummaryColumns, SummaryRow } from './helpers';
import { useRuleWithFallback } from '../../../detections/containers/detection_engine/rules/use_rule_with_fallback';
import { MarkdownRenderer } from '../markdown_editor';
import { LineClamp } from '../line_clamp';
import { endpointAlertCheck } from '../../utils/endpoint_alert_check';

export const Indent = styled.div`
  padding: 0 8px;
  word-break: break-word;
`;

const fields = [
  { id: 'signal.status', label: SIGNAL_STATUS },
  { id: '@timestamp', label: TIMESTAMP },
  {
    id: SIGNAL_RULE_NAME_FIELD_NAME,
    linkField: 'signal.rule.id',
    label: ALERTS_HEADERS_RULE,
  },
  { id: 'signal.rule.severity', label: ALERTS_HEADERS_SEVERITY },
  { id: 'signal.rule.risk_score', label: ALERTS_HEADERS_RISK_SCORE },
  { id: 'host.name' },
  { id: 'agent.status' },
  { id: 'user.name' },
  { id: SOURCE_IP_FIELD_NAME, fieldType: IP_FIELD_TYPE },
  { id: DESTINATION_IP_FIELD_NAME, fieldType: IP_FIELD_TYPE },
  { id: 'signal.threshold_result.count', label: ALERTS_HEADERS_THRESHOLD_COUNT },
  { id: 'signal.threshold_result.terms', label: ALERTS_HEADERS_THRESHOLD_TERMS },
  { id: 'signal.threshold_result.cardinality', label: ALERTS_HEADERS_THRESHOLD_CARDINALITY },
];

const processFields = [
  ...fields,
  { id: 'process.name' },
  { id: 'process.parent.name' },
  { id: 'process.args' },
];

const networkFields = [
  ...fields,
  { id: 'destination.address' },
  { id: 'destination.port' },
  { id: 'process.name' },
];

const getDescription = ({
  contextId,
  eventId,
  fieldName,
  value,
  fieldType = '',
  linkValue,
}: AlertSummaryRow['description']) => (
  <FormattedFieldValue
    contextId={`alert-details-value-formatted-field-value-${contextId}-${eventId}-${fieldName}-${value}`}
    eventId={eventId}
    fieldName={fieldName}
    fieldType={fieldType}
    value={value}
    linkValue={linkValue}
  />
);

const getSummaryRows = ({
  data,
  browserFields,
  timelineId,
  eventId,
}: {
  data: TimelineEventsDetailsItem[];
  browserFields: BrowserFields;
  timelineId: string;
  eventId: string;
}) => {
  const categoryField = find({ category: 'event', field: 'event.category' }, data) as
    | TimelineEventsDetailsItem
    | undefined;
  const eventCategory = Array.isArray(categoryField?.originalValue)
    ? categoryField?.originalValue[0]
    : categoryField?.originalValue;

  const tableFields =
    eventCategory === 'network'
      ? networkFields
      : eventCategory === 'process'
      ? processFields
      : fields;

  return data != null
    ? tableFields.reduce<SummaryRow[]>((acc, item) => {
        const field = data.find((d) => d.field === item.id);
        if (!field) {
          return acc;
        }
        const linkValueField =
          item.linkField != null && data.find((d) => d.field === item.linkField);
        const linkValue = getOr(null, 'originalValue.0', linkValueField);
        const value = getOr(null, 'originalValue.0', field);
        const category = field.category;
        const fieldType = get(`${category}.fields.${field.field}.type`, browserFields) as string;
        const description = {
          contextId: timelineId,
          eventId,
          fieldName: item.id,
          value,
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
                    value: entry.value,
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
                  value: `count(${parsedValue.field}) == ${parsedValue.value}`,
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
      }, [])
    : [];
};

const summaryColumns: Array<EuiBasicTableColumn<SummaryRow>> = getSummaryColumns(getDescription);

const AlertSummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  timelineId: string;
  title?: string;
}> = ({ browserFields, data, eventId, timelineId, title }) => {
  const summaryRows = useMemo(() => getSummaryRows({ browserFields, data, eventId, timelineId }), [
    browserFields,
    data,
    eventId,
    timelineId,
  ]);

  const isEndpointAlert = useMemo(() => {
    return endpointAlertCheck({ data });
  }, [data]);

  const endpointId = useMemo(() => {
    const findAgentId = find({ category: 'agent', field: 'agent.id' }, data)?.values;
    return findAgentId ? findAgentId[0] : '';
  }, [data]);

  const agentStatusRow = {
    title: i18n.AGENT_STATUS,
    description: {
      contextId: timelineId,
      eventId,
      fieldName: 'agent.status',
      value: endpointId,
      linkValue: undefined,
    },
  };

  const summaryRowsWithAgentStatus = [...summaryRows, agentStatusRow];

  const ruleId = useMemo(() => {
    const item = data.find((d) => d.field === 'signal.rule.id');
    return Array.isArray(item?.originalValue)
      ? item?.originalValue[0]
      : item?.originalValue ?? null;
  }, [data]);
  const { rule: maybeRule } = useRuleWithFallback(ruleId);

  return (
    <>
      <EuiSpacer size="l" />
      <SummaryView
        summaryColumns={summaryColumns}
        summaryRows={isEndpointAlert ? summaryRowsWithAgentStatus : summaryRows}
        title={title}
      />
      {maybeRule?.note && (
        <>
          <EuiHorizontalRule />
          <EuiTitle size="xxxs" data-test-subj="summary-view-guide">
            <h5>{i18n.INVESTIGATION_GUIDE}</h5>
          </EuiTitle>
          <EuiSpacer size="s" />
          <Indent>
            <EuiText size="xs">
              <LineClamp lineClampHeight={4.5}>
                <MarkdownRenderer>{maybeRule.note}</MarkdownRenderer>
              </LineClamp>
            </EuiText>
          </Indent>
        </>
      )}
    </>
  );
};

export const AlertSummaryView = React.memo(AlertSummaryViewComponent);
