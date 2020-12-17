/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
} from '../../../detections/components/alerts_table/translations';
import {
  IP_FIELD_TYPE,
  SIGNAL_RULE_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { DESTINATION_IP_FIELD_NAME, SOURCE_IP_FIELD_NAME } from '../../../network/components/ip';
import { LineClamp } from '../line_clamp';
import { useRuleAsync } from '../../../detections/containers/detection_engine/rules/use_rule_async';

interface SummaryRow {
  title: string;
  description: {
    contextId: string;
    eventId: string;
    fieldName: string;
    value: string;
    fieldType: string;
    linkValue: string | undefined;
  };
}
type Summary = SummaryRow[];

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
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StyledEuiInMemoryTable = styled(EuiInMemoryTable as any)`
  .euiTableHeaderCell {
    border: none;
  }
  .euiTableRowCell {
    border: none;
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
  value,
  fieldType = '',
  linkValue,
}: SummaryRow['description']) => (
  <FormattedFieldValue
    contextId={`alert-details-value-formatted-field-value-${contextId}-${eventId}-${fieldName}-${value}`}
    eventId={eventId}
    fieldName={fieldName}
    fieldType={fieldType}
    value={value}
    linkValue={linkValue}
  />
);

const getSummary = ({
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
  return data != null
    ? fields.reduce<Summary>((acc, item) => {
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

export const SummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  timelineId: string;
}> = ({ data, eventId, timelineId, browserFields }) => {
  const ruleId = useMemo(() => {
    const item = data.find((d) => d.field === 'signal.rule.id');
    return Array.isArray(item?.originalValue)
      ? item?.originalValue[0]
      : item?.originalValue ?? null;
  }, [data]);
  const { rule: maybeRule } = useRuleAsync(ruleId);
  const summaryList = useMemo(() => getSummary({ browserFields, data, eventId, timelineId }), [
    browserFields,
    data,
    eventId,
    timelineId,
  ]);

  return (
    <>
      <StyledEuiInMemoryTable
        data-test-subj="summary-view"
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
