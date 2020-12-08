/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useMemo, useState } from 'react';

import {
  EuiBadge,
  EuiDescriptionList,
  EuiSpacer,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
} from '@elastic/eui';

import { get, getOr } from 'lodash/fp';
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
import {
  DESTINATION_IP_FIELD_NAME,
  Ip,
  SOURCE_IP_FIELD_NAME,
} from '../../../network/components/ip';
import { LineClamp } from '../line_clamp';
import { useRuleAsync } from '../../../detections/containers/detection_engine/rules/use_rule_async';

type Summary = Array<{ title: string; description: JSX.Element }>;

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

const getDescription = ({
  contextId,
  eventId,
  fieldName,
  value,
  fieldType = '',
  linkValue,
}: {
  contextId: string;
  eventId: string;
  fieldName: string;
  value?: string | null;
  fieldType?: string;
  linkValue?: string;
}) => {
  if (fieldType === IP_FIELD_TYPE) {
    return (
      <Ip
        contextId={`alert-details-value-formatted-field-value-${contextId}-${eventId}-${fieldName}-${value}`}
        eventId={eventId}
        fieldName={fieldName}
        value={value}
      />
    );
  }

  if (fieldName === 'signal.status') {
    return (
      <EuiBadge>
        <FormattedFieldValue
          contextId={`alert-details-value-formatted-field-value-${contextId}-${eventId}-${fieldName}-${value}`}
          eventId={eventId}
          fieldName={fieldName}
          fieldType={fieldType}
          value={value}
        />
      </EuiBadge>
    );
  }

  return (
    <FormattedFieldValue
      contextId={`alert-details-value-formatted-field-value-${contextId}-${eventId}-${fieldName}-${value}`}
      eventId={eventId}
      fieldName={fieldName}
      fieldType={fieldType}
      value={value}
      linkValue={linkValue}
    />
  );
};

export const SummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  timelineId: string;
}> = ({ data, eventId, timelineId, browserFields }) => {
  const [investigationGuide, setInvestigationGuide] = useState<string | null>(null);

  const ruleIdField = useMemo(() => data.find((d) => d.field === 'signal.rule.id'), [data]);
  const ruleId = getOr(null, 'originalValue', ruleIdField);
  const { rule: maybeRule } = useRuleAsync(ruleId);
  const summaryList = useMemo(() => {
    return data != null
      ? fields.reduce<Summary>((acc, item) => {
          const field = data.find((d) => d.field === item.id);
          if (!field) {
            return acc;
          }
          const linkValueField =
            item.linkField != null && data.find((d) => d.field === item.linkField);
          const linkValue = getOr(null, 'originalValue', linkValueField);
          const value = getOr(null, 'originalValue', field);
          const category = field.category;
          const fieldType = get(`${category}.fields.${field.field}.type`, browserFields) as string;
          const description = getDescription({
            contextId: timelineId,
            eventId,
            fieldName: item.id,
            value,
            fieldType: item.fieldType ?? fieldType,
            linkValue: linkValue ?? undefined,
          });

          return [
            ...acc,
            {
              title: item.label ?? item.id,
              description,
            },
          ];
        }, [])
      : [];
  }, [browserFields, data, eventId, timelineId]);

  useEffect(() => {
    if (maybeRule != null && maybeRule.note != null) {
      setInvestigationGuide(maybeRule.note);
    }
  }, [maybeRule]);

  return (
    <>
      <EuiSpacer size="m" />
      <EuiDescriptionList
        data-test-subj="summary-view"
        type="responsiveColumn"
        listItems={summaryList}
        compressed
      />
      {investigationGuide != null && (
        <>
          <EuiSpacer />
          <EuiDescriptionList data-test-subj="summary-view-guide" compressed>
            <EuiDescriptionListTitle>{i18n.INVESTIGATION_GUIDE}</EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <LineClamp content={investigationGuide} />
            </EuiDescriptionListDescription>
          </EuiDescriptionList>
        </>
      )}
    </>
  );
};

export const SummaryView = React.memo(SummaryViewComponent);
