/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';

import {
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

type Summary = Array<{ title: string; description: JSX.Element }>;

const fields = [
  '@timestamp',
  'signal.status',
  'signal.rule.description',
  'signal.rule.severity',
  'signal.rule.riskScore',
  'user.name',
  'host.name',
  'source.ip',
  'destination.ip',
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

const SummaryViewComponent: React.FC<{
  browserFields: BrowserFields;
  data: TimelineEventsDetailsItem[];
  eventId: string;
  timelineId: string;
}> = ({ data, eventId, timelineId, browserFields }) => {
  const summaryList = useMemo(() => {
    return (data || []).reduce<Summary>((acc, item) => {
      const fieldValue = getOr(null, 'values.0', item);
      const eventCategory = item.category;
      const fieldType = getOr(
        'string',
        `${eventCategory}.fields.${item.field}.type`,
        browserFields
      );
      const fieldFormat = get(`${eventCategory}.fields.${item.field}.format`, browserFields);
      return fields.indexOf(item.field) >= 0
        ? [
            ...acc,
            {
              title: item.field,
              description: (
                <FormattedFieldValue
                  contextId={`alert-details-value-formatted-field-value-${timelineId}-${eventId}-${item.field}-${fieldValue}`}
                  eventId={eventId}
                  fieldFormat={fieldFormat}
                  fieldName={item.field}
                  fieldType={fieldType}
                  value={fieldValue}
                />
              ),
            },
          ]
        : acc;
    }, []);
  }, [data, eventId, timelineId, browserFields]);

  const messageData = (data || []).find((item) => item.field === 'message');
  const message = get('values.0', messageData);
  const [readMoreButtonText, setReadMoreButtonText] = useState(i18n.READ_MORE);
  const [isOverflow, setIsOverflow] = useState<boolean | null>(null);
  const [isExpanded, setIsReadMoreClicked] = useState<boolean | null>(null);
  const descriptionRef = useRef<HTMLElement>();
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
