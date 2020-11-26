/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';

import {
  EuiBadge,
  EuiDescriptionList,
  EuiSpacer,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiButtonEmpty,
} from '@elastic/eui';
import styled from 'styled-components';

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
  MESSAGE_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import {
  DESTINATION_IP_FIELD_NAME,
  Ip,
  SOURCE_IP_FIELD_NAME,
} from '../../../network/components/ip';

type Summary = Array<{ title: string; description: JSX.Element }>;

const fields = [
  { id: 'signal.status' },
  { id: '@timestamp' },
  {
    id: SIGNAL_RULE_NAME_FIELD_NAME,
    linkField: 'signal.rule.description',
    label: ALERTS_HEADERS_RULE,
  },
  { id: 'signal.rule.severity', label: ALERTS_HEADERS_SEVERITY },
  { id: 'signal.rule.risk_score', label: ALERTS_HEADERS_RISK_SCORE },
  { id: 'host.name' },
  { id: 'user.name' },
  { id: SOURCE_IP_FIELD_NAME, fieldType: IP_FIELD_TYPE },
  { id: DESTINATION_IP_FIELD_NAME, fieldType: IP_FIELD_TYPE },
];
const LINE_CLAMP = 3;
const LINE_CLAMP_HEIGHT = 4.5;

const LineClamp = styled.div`
  display: -webkit-box;
  -webkit-line-clamp: ${LINE_CLAMP};
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-height: ${`${LINE_CLAMP_HEIGHT}em`};
  height: ${`${LINE_CLAMP_HEIGHT}em`};
`;

const StyledDescription = styled(EuiDescriptionListDescription)`
  word-break: break-all;
`;

const ReadMore = styled(EuiButtonEmpty)`
  span.euiButtonContent {
    padding: 0;
  }
`;

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

const SummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  timelineId: string;
}> = ({ data, eventId, timelineId, browserFields }) => {
  const summaryList = useMemo(() => {
    const ruleIdField = data.find((d) => d.field === 'signal.rule.rule_id');
    const ruleId = getOr(null, 'values.0', ruleIdField);
    return data != null
      ? fields.reduce<Summary>((acc, item) => {
          const field = data.find((d) => d.field === item.id || d.field === item.linkField);
          if (!field) {
            return acc;
          }

          const fieldValue = getOr(null, 'values.0', field);
          const category = field.category;
          const fieldType = get(`${category}.fields.${field.field}.type`, browserFields) as string;
          const description = getDescription({
            contextId: timelineId,
            eventId,
            fieldName: item.id,
            value: fieldValue,
            fieldType: item.fieldType ?? fieldType,
            linkValue: item.id === SIGNAL_RULE_NAME_FIELD_NAME ? ruleId : undefined,
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

  const messageData = (data || []).find((item) => item.field === MESSAGE_FIELD_NAME);
  const message = get('values.0', messageData);
  const [readMoreButtonText, setReadMoreButtonText] = useState(i18n.READ_MORE);
  const [isOverflow, setIsOverflow] = useState<boolean | null>(null);
  const [isExpanded, setIsReadMoreClicked] = useState<boolean | null>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const toggleReadMore = useCallback(() => {
    setIsReadMoreClicked((prevState) => !prevState);
    setReadMoreButtonText((prevState) =>
      prevState === i18n.READ_MORE ? i18n.READ_LESS : i18n.READ_MORE
    );
  }, []);

  useEffect(() => {
    if (message != null && descriptionRef?.current?.clientHeight != null) {
      if (
        (descriptionRef?.current?.scrollHeight ?? 0) > (descriptionRef?.current?.clientHeight ?? 0)
      ) {
        setIsOverflow(true);
      }

      if (
        ((message == null || descriptionRef?.current?.scrollHeight) ?? 0) <=
        (descriptionRef?.current?.clientHeight ?? 0)
      ) {
        setIsOverflow(false);
      }
    }
  }, [message, descriptionRef?.current?.clientHeight]);

  return (
    <>
      <EuiSpacer />
      <EuiDescriptionList type="responsiveColumn" listItems={summaryList} compressed />
      {message != null && (
        <>
          <EuiSpacer />
          <EuiDescriptionList compressed>
            <EuiDescriptionListTitle>{i18n.INVESTIGATION_GUIDE}</EuiDescriptionListTitle>
            <StyledDescription>
              {isExpanded ? (
                <p>{message}</p>
              ) : (
                <LineClamp ref={descriptionRef}>{message}</LineClamp>
              )}
            </StyledDescription>
          </EuiDescriptionList>
          {isOverflow && (
            <ReadMore onClick={toggleReadMore} size="s">
              {readMoreButtonText}
            </ReadMore>
          )}
        </>
      )}
    </>
  );
};

export const SummaryView = React.memo(SummaryViewComponent);
